+++
draft = false
date = 2024-03-20T13:00:00Z
title = "Railway-Oriented Pipelines in Ruby pt. 4: Middleware"
description = "Implementing middleware in a Railway-oriented pipeline in Ruby."
images = ["/images/2024/railway-oriented-pipelines-ruby-middleware.png"]
slug = "railway-oriented-ruby-middleware"
authors = ["Ismael Celis"]
tags = ["ruby", "functional", "pipelines", "composition"]
categories = []
externalLink = ""
series = []
+++

In this series:
* Part 1: [Practical Railway-Oriented Pipelines in Ruby](/posts/practical-railway-oriented-pipelines-in-ruby/)
* Part 2: [User input, errors and metadata](/posts/railway-oriented-ruby-result-metadata/)
* Part 3: [Extending pipelines](/posts/railway-oriented-ruby-extending-pipelines/)
* **Part 4**: Middleware
* Part 5: [Testing pipelines](/posts/railway-oriented-ruby-testing/)

In the [previous article](/posts/railway-oriented-ruby-extending-pipelines/) in this series I showed how to extend the basic pipeline with domain-specific steps and helpers.

Here I'll show how to add middleware to the pipeline, to add tracing, logging, caching, and other cross-cutting concerns.

## Middleware

Middleware is a bit of code that wraps around each step in the pipeline, adding functionality to it. See [Rack](https://github.com/rack/rack?tab=readme-ov-file#available-middleware-shipped-with-rack) for a well-known use case.

As an example, I want to add middleware that adds `context[:halted_step]` to the `Result` instance, so that we know exactly what step halted the pipeline.

As a starter implementation, I'll tweak `Pipeline#step` to wrap all registered steps with a middleware that adds the `halted_step` to the result context if the step halts the pipeline.

```ruby
class Pipeline
  # ... etc

  def step(callable, &block)
    callable ||= block
    raise ArgumentError, "Step must respond to #call" unless callable.respond_to?(:call)

    # Wrap the step with a middleware before appending it to the list
    callable = StepTracker.new(callable)

    steps << callable
    self
  end
end
```

A middleware step wraps around the execution of another step.

```ruby
# Delegate anything else to the underlying step
# https://ruby-doc.org/3.3.0/stdlibs/delegate/SimpleDelegator.html
class StepTracker < SimpleDelegator
  # Capture the call to a step, and add something to the context if it halted.
  def call(result)
    step = __getobj__
    result = step.call(result)
    return result.with_context(:halted_step, step) unless result.continue?
    result
  end
end
```

Now, `context[:halted_step]` will be set to the step that halted the pipeline.

We also get `context[:trace]` to show the position of the halted step in the pipeline, as shown [in the previous article](/posts/railway-oriented-ruby-extending-pipelines/#tracing-step-positions).

```ruby
result = BigPipeline.call(Result.continue)
result.continue? # => false
result.context[:halted_step] # => FailedStep
result.context[:trace] # => [3, 2]
```

Note that the same middleware approach can be used to add other tracing and introspection features to the pipeline. Some examples:

```ruby
callable = Instrumentation.new(callable)
callable = Logging.new(callable, Rails.logger)
callable = StepTracker.new(callable)
steps << callable
```

It's also possible to add class-level configuration to register middleware for `Pipeline` subclasses.

```ruby
class MyPipeline < Pipeline
  middleware Instrumentation.new(api_key: ENV.fetch('API_KEY'))
  middleware Logging.new(Rails.logger)
end
```

A framework-agnostic implementation for that is included in the [code gist](https://gist.github.com/ismasan/0bdcc76c2ea48f4259b38fafe131edb8)

> Middleware steps might look similar to regular steps, but they are not.
> Each registered middleware step wraps around every regular step, including in nested pipelines.

## CLIs

A CLI-tailored pipeline class can leverage step tracing to print step positions and halt reasons to the terminal.

```ruby
class StepPrinter < SimpleDelegator
  def call(result)
    step = __getobj__
    position = result.context[:trace].join(".")
    result = step.call(result)
    status = result.success? ? 'OK' : 'ERROR'
    errors = result.errors.any? ? "Errors: #{result.errors}" : ""
    puts "#{position}. [#{status}] #{step} #{errors}"
    result
  end
end
```

```
1. [OK] InputStep
2. [OK] ParseCSV
3. [OK] ValidateCSV
3.1. [OK] ValidateHeaders
3.2. [ERROR] ValidateRows Errors: { 1: "Invalid format" }
```

## Caching middleware

A piece of middleware can optimise expensive operations by caching their results.

```ruby
class CachedStep < SimpleDelegator
  def initialize(step, cache)
    @cache = cache
    super(step)
  end

  def call(result)
    cache_key = result.value.cache_key # or something else
    # Only call expensive operation if not in cache
    # and store the result in the cache
    @cache.fetch(cache_key) do
      __getobj__.call(result)
    end
  end
end
```

<ul class="execution-trace">
    <li class="warning">1. <code>Expensive Operation 1</code><span class="note">cached, skipped</span></li>
    <li class="warning">2. <code>Expensive Operation 2</code><span class="note">cached, skipped</span></li>
    <li class="running">3. <code>Expensive Operation 3</code><span class="note">not cached, running</span></li>
    <li>4. <code>ExpensiveOperation4</code><span class="note">pending</span></li>
</ul>

Caching could also be controlled selectively for one or more steps, via a custom sub-pipeline and a helper method. See [Extending Pipelines](/posts/railway-oriented-ruby-extending-pipelines/) for how to implement these helpers.

```ruby
pl.step OkStep
pl.cached do |ch|
  ch.step ExpensiveStep
  ch.step AnotherExpensiveStep
end
pl.step OkStep
```

## Other use cases

I've found that these pipelines make it simple to assemble a wide range of processing workflows big and small. Most specialisation can be contained in the steps themselves, and the pipeline class can be kept simple and generic.

### Query builders

You can use it to build complex queries for databases or APIs.

```ruby
pl.step do |result|
  query = result.value # An ActiveRecord::Relation or a Sequel::Dataset
  account_id = result.params[:account_id]
  query = query.where(account_id:) if account_id
  result.continue(query)
end

# Composable query components
pl.step FullTextSearch
```

### Durable execution

You can use it to build durable execution workflows, where each step is a task that can be retried or rolled back.
This can be used to build robust and fault-tolerant operations. For example background jobs, or long-running [sagas](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga).

```ruby
class DurablePipeline < Pipeline
  # Custom middleware to store the result of last successful step
  # In case of failure, the pipeline can be resumed from the last successful step
  middleware DurableExecution.new(store: Redis.new)
end

HolidayBookingSaga = DurablePipeline.new do |pl|
  pl.step BookFlights
  pl.step BookHotel
  pl.step BookCarRental
  pl.step SendConfirmationEmail
end
```

### Concurrent execution

It's reasonably straightforward to build a pipeline that runs steps concurrently, for example to optimise I/O-bound operations.

```ruby
HolidayBookingSaga = Pipeline.new do |pl|
  # .. etc

  # Run these steps concurrently, then collect their results in order.
  # For example using Fibers or Threads.
  # This block can implement _all_ or _any_ semantics.
  pl.concurrent do |c|
    c.step BookFlights
    c.step BookHotel
    c.step BookCarRental
  end

  # Send email once all bookings are confirmed
  pl.step SendConfirmationEmail
end
```

[This](https://gist.github.com/ismasan/0bdcc76c2ea48f4259b38fafe131edb8#file-concurrent_processing-rb) is a basic implementation of that.

### HTTP handlers

In Ruby we have plenty of incredible web frameworks to choose from, but a pipeline-oriented approach to web handling could be a good fit for some use cases. A bit like Elixir's [Plug](https://hexdocs.pm/plug/readme.html).

```ruby
module API
  CreateUserHandler = HTTPPipeline.new do |pl|
    pl.params do
      # This syntax belongs to Parametric, but you can use anything else
      # for input validation.
      field(:name).type(:string).required
      field(:email).type(:string).required
    end

    pl.step ValidateUserInput
    pl.step CreateUser
    pl.step SendWelcomeEmail
    pl.respond_with(201, :created)
    pl.respond_with(400, :bad_request)
  end
end
```

In future articles I might explore the potential of middleware in more depth.

In the next article, I'll touch on testing pipelines and steps.

