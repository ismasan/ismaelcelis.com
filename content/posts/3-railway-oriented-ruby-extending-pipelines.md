+++
draft = false
date = 2024-03-20T12:00:00Z
title = "Railway-Oriented Pipelines in Ruby pt. 3: Extending pipelines"
description = "Implementing domain-specific steps and extending a Railway-oriented pipelines in Ruby."
images = ["/images/2024/railway-oriented-pipelines-ruby-extending.png"]
slug = "railway-oriented-ruby-extending-pipelines"
authors = ["Ismael Celis"]
tags = ["ruby", "functional", "pipelines", "composition"]
categories = []
externalLink = ""
series = []
+++

In this series:
* Part 1: [Practical Railway-Oriented Pipelines in Ruby](/posts/practical-railway-oriented-pipelines-in-ruby/)
* Part 2: [User input, errors and metadata](/posts/railway-oriented-ruby-result-metadata/)
* **Part 3**: Extending pipelines
* Part 4: [Middleware](/posts/railway-oriented-ruby-middleware/)
* Part 5: [Testing pipelines](/posts/railway-oriented-ruby-testing/)

In the [previous article](/posts/railway-oriented-ruby-result-metadata/) in this series I showed how to pass extra metadata from one step to the next, including user input, errors and context data.

This article expands on the previous ones by showing how to extend the pipeline with domain-specific steps and helpers.

## Extending the pipeline

The `Pipeline` class itself can be subclassed or extended to add domain-specific functionality.
One that I've found helpful is to add a terse DSL for input parameter validation.

```ruby
NumberCruncher = ValidatingPipeline.new do |pl|
  # the #params helper adds a step to validate input parameters
  pl.params do
    field(:limit).type(:integer).required.default(5)
    field(:lte).type(:integer).required
  end

  # ... other steps here
end
```

All `#params` does is register a step using a specialised class that knows how to validate result parameters. That class exposes the `#call(Result) Result` interface, and halts the pipeline if any parameter is invalid.

```ruby
class ValidatingPipeline < Pipeline
  # ... etc

  # A helper method to register a custom step
  def params(&block)
    step ParamsValidator.new(&block)
  end
end
```

I use my [Parametric](https://github.com/ismasan/parametric) gem for this, but anything that makes sense for your domain will do. [Dry::Types](https://dry-rb.org/gems/dry-types/) is another good option. Or Rails' [ActiveModel::Validations](https://api.rubyonrails.org/classes/ActiveModel/Validations.html) (as shown in the previous article) if you're in a Rails app.

[This](https://gist.github.com/ismasan/3b83cac959cda653f60ee0c57cc922da) is the implementation.

This means that complex operations can now be packaged up and validate their own inputs.

```ruby
# A portable step to multiply each number in the set by a factor.
Multiply = Pipeline.new do |pl|
  pl.params do
    field(:factor).type(:integer).required.default(1)
  end

  pl.step do |result|
    factor = result.params[:factor]
    result.continue(result.value.map { |n| n * factor })
  end
end

# A portable step to limit the set to the first N elements.
# It defines its own required parameters.
LimitSet = Pipeline.new do |pl|
  pl.params do
    field(:limit).type(:integer).required.default(5)
  end

  pl.step do |result|
    set = result.value.first(result.params[:limit])
    result.continue(set)
  end
end
```

```ruby
NumberCruncher = Pipeline.new do |pl|
  pl.step ValidateNumbers.new(lte: 100)
  pl.step Multiply
  pl.step LimitSet
end
```

I use helper methods to simplify domain-specific pipelines. Some other examples include:

```ruby
MyPipeline = DatasetPipeline.new do |pl|
  # A helper to filter elements in a set.
  # Returns a new [Result] with the filtered set.
  pl.filter do |element|
    element > 10
  end

  # A helper to sort elements in a set
  pl.sort do |a, b|
    a <=> b
  end

  # A development helper to invoke a Byebug or Pry session at this point
  pl.debug
end
```

For most, the implementation is trivial.

```ruby
class DatasetPipeline < Pipeline
  def filter(&block)
    step do |result|
      set = result.value.filter(&block)
      result.continue(set)
    end
  end

  def sort(&block)
    step do |result|
      set = result.value.sort(&block)
      result.continue(set)
    end
  end

  def debug
    step do |result|
      binding.pry
      result
    end
  end
end
```

## Tracing step positions

As workflows become more complex, it's helpful to have ways to trace and instrospect execution.
For example, when a step halts the pipeline, I would like to know exactly what step it was, and at what depth in the pipeline it sits.

We'll deal with the latter first. The following tweaks `Pipeline#call` to keep track of the current step position relative to its parent pipeline.

```ruby
class Pipeline
  # ... etc

  # For each step, keep track of its position in the pipeline
  # in the result context.
  def call(result)
    trace = result.context[:trace] || []
    steps.each.with_index(1).reduce(result) do |res, (step, position)|
      if res.continue?
        step.call(res.with_context(:trace, trace + [position]))
      else
        res
      end
    end
  end
end
```

With this, the `Result` instance passed to each step will have a `:trace` key in its context, which is an array of integers representing the position of the step in the pipeline.

For example:

```ruby
OkStep = ->(result) { result.continue }

FailStep = ->(result) { result.halt }

ChildPipeline = Pipeline.new do |pl|
  pl.step OkStep
  pl.step FailedStep # <- this one halts the pipeline
  pl.step OkStep
end

BigPipeline = Pipeline.new do |pl|
  pl.step OkStep
  pl.step OkStep
  pl.step ChildPipeline # <- 2nd step in this pipeline halts
  pl.step OkStep
end
```

`FailedStep` inside the child pipeline will be the last step in the trace, and `#context[:trace]` will be `[3, 2]`, because it's the third step in the child pipeline, and the child pipeline is the second step in the parent pipeline.

```ruby
result = BigPipeline.call(Result.continue)
result.continue? # => false
result.context[:trace] # => [3, 2]
```

In other words:

<ul class="execution-trace">
    <li class="continue">[1] <code>OkStep</code></li>
    <li class="continue">[2] <code>OkStep</code></li>
    <li class="continue">
        [3] <code>ChildPipeline</code>
        <ul>
            <li class="continue">[3,1] <code>OkStep</code></li>
            <li class="halt">[3,2] <code>FailedStep</code></li>
            <li class="never">[3,3] <code>OkStep</code></li>
        </ul>
    </li>
    <li class="never">[4] <code>OkStep</code></li>
</ul>

In the following article I'll show how to leverage this metadata when adding middleware to pipelines.

