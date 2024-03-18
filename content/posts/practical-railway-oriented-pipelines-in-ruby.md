+++
draft = false
date = 2024-03-17T12:19:16Z
title = "Practical Railway-Oriented Pipelines in Ruby"
description = "A simplified approach to building composable data pipelines in Ruby."
images = ["/images/2022/railway-oriented-pipelines-front.png"]
slug = ""
authors = ["Ismael Celis"]
tags = ["ruby", "design patterns", "functional", "pipelines", "composition"]
categories = []
externalLink = ""
series = []
+++

Some years ago I [explored patterns](/posts/composable-pipelines-in-ruby/) for building composable processing pipelines in Ruby, using a Railway-oriented paradigm.

Here, I describe a simplified implementation for practical use.

```ruby
# An illustrative data processing pipeline
DataImporter = Pipeline.new do |pl|
  pl.step ExtractData
  pl.step TransformData
  pl.step LoadData
end
```

I've relied on versions of this approach in various projects for some time now, and I've found it to be a very effective way to build and maintain complex data processing workflows.

## The result class

A generic `Result` wraps values passed through the pipeline, and can be in one of two states: `Continue` or `Halt`.
The values themselves can be anything relevant to the domain, but `Result` offers a consistent interface for handling them in the pipeline, as well as metadata such as user input, errors and arbitrary context.

```ruby
# Initial result
result = Result.continue([1, 2, 3, 4])
result.input # {}
result.errors # {}
result.context # {}
result.continue? # => true
result = result.halt
result.continue? # => false
```

`Result` instances can be initialised or copied to add input, errors or context data.

```ruby
result = Result.continue([1, 2, 3, 4], input: { limit: 2 })
result.input # { limit: 2 }
# Produce a new Result with some context data.
result = result.with_context(:count, 4)
result.context[:count] = 4
```

* The `input` Hash is meant to pass external user or system input relevant for processing.
* The `errors` Hash is meant to accumulate errors during processing.
* The `context` Hash is meant to pass arbitrary data between pipeline steps.

Helper methods such as `#with_context` and `#with_error` as well as `#halt` and `#continue` work to help manipulate result instances as it moves through the pipeline.

```ruby
result = result.halt.with_error(:limit, "Exceeded")
# result.continue? => false
# result.errors => { limit: "Exceeded" }
```

## The pipeline

A pipeline is a sequence of steps that process a `Result` and return a new `Result`.
a `Step` is a simple object that responds to `#call` and takes a `Result` as input, returning a new `Result`.

```ruby
MyPipeline = Pipeline.new do |pl|
  # Anything that responds to #call can be a step
  pl.step MyCustomStep.new

  # Or a simple proc. This one limits the set by the :limit input
  pl.step do |result|
    set = result.value.first(result.input[:limit])
    result.continue(set)
  end
end

# Usage
initial_result = Result.continue((1..100), input: { limit: 5 })
result = MyPipeline.call(initial_result)
result.value # => [1, 2, 3, 4, 5]
```

There's very little to the `Pipeline` class itself.

```ruby
class Pipeline
  attr_reader :steps

  def initialize(&block)
    @steps = []
    block.call(self) and @steps.freeze if block_given?
  end

  def step(callable, &block)
    callable ||= block
    raise ArgumentError, "Step must respond to #call" unless callable.respond_to?(:call)
    steps << callable
    self
  end

  # Iterate steps, call each one in turn,
  # passing the result of the previous step to the next.
  def call(result)
    steps.reduce(result) { |r, step| step.call(r) }
  end
end
```

## The Railway bit

Where this becomes useful is in the ability to "halt" processing at any point in the pipeline.

```ruby
MyPipeline = Pipeline.new do |pl|
  # This step halts processing if the set size is greater than 100
  pl.step do |result|
    if result.value.size > 100
      return result.halt.with_error(:value, "Too many elements")
    end
    result
  end

  # This step should never be called if the previous one halted the result
  pl.step do |result|
    result.continue(result.value.map { |n| n * 2 })
  end
end
```

To make this work, we just need to make a small tweak to the `#call` method in the `Pipeline` class.

```ruby
def call(result)
  steps.reduce(result) do |r, step|
    # If the result is halted, return it untouched.
    r.continue? ? step.call(r) : r
  end
end
```

Now, any step that returns a _halt_ will just skip further steps downstream. Lets do some number crunching:

```ruby
# A portable step to validate set size
class ValidateSetSize
  def initialize(lte:) = @lte = lte

  def call(result)
    return result.halt.with_error(:value, "Too many elements") if result.value.size > @lte
    result
  end
end

# A step to multiply each number in the set by a factor
# This one is a Proc that returns a Proc.
MultiplyBy = proc do |factor|
  proc do |result|
    result.continue(result.value.map { |n| n * factor })
  end
end

# A step to limit the set to the first N elements, as per input[:limit]
LimitSet = proc do |result|
  set = result.value.first(result.input[:limit])
  result.continue(set)
end

# Compose the pipeline
NumberCruncher = Pipeline.new do |pl|
  pl.step ValidateSetSize.new(lte: 100)
  pl.step MultiplyBy.(2)
  pl.step LimitSet
end
```

In this example, the first `ValidateSetSize` step will halt the pipeline if the set size is greater than 100, preventing `MultiplyBy` and `LimitSet` steps from running.

```ruby
initial_result = Result.continue((1..101), input: { limit: 5 })
result = NumberCruncher.call(initial_result)
result.continue? # => false
result.errors # => { value: "Too many elements" }
```

<style>
.execution-trace {
  list-style: none;
  padding-left: 0;
  font-family: monospace;
  font-size: 0.9em;
  color: #666;
}
.execution-trace li {
  position: relative;
}
.execution-trace ul {
  list-style: none;
  margin-bottom: 0;
}

.execution-trace ul li {
  padding-left: 1em;
}
.execution-trace ul li::before {
  content: '';
  position: absolute;
  left: -0.5em;
  top: 0.5em;
  width: 1em;
  height: 0.5em;
  border-left: 1px solid #666;
  border-bottom: 1px solid #666;
}
.execution-trace li > code {
    margin-inline: 0;
}
.execution-trace .halt > code {
    color: #c00;
    background-color: #fdd;
    font-weight: bold;
}
.execution-trace .halt::after {
    content: ' ← halted';
    font-size: 0.8em;
}
.execution-trace .never::after {
    content: ' ← never run';
    font-size: 0.8em;
}
.execution-trace .note {
    font-size: 0.8em;
}
.execution-trace .note::before {
    content: ' ← ';
}
.execution-trace .continue > code {
    color: #038a03;
    background-color: #dfd;
    font-weight: bold;
}
.execution-trace .running > code {
    color: #b3762b;
    background-color: #f7ebc1;
    font-weight: bold;
}
.execution-trace .warning > code {
    color: #168594;
    background-color: #c1f1f7;
    font-weight: bold;
}
</style>

<ul class="execution-trace">
    <li class="halt">1. <code>ValidateSetSize.new(lte: 100)</code></li>
    <li class="never">2. <code>MultiplyBy.(2)</code></li>
    <li class="never">3. <code>LimitSet</code></li>
</ul>

However, if all steps return a _continue_ result, the pipeline processes all steps and returns the final result.

```ruby
initial_result = Result.continue((1..99), input: { limit: 5 })
result = MyPipeline.call(initial_result)
result.continue? # => true
# Each number in set was multiplied by 2, then limited to the first 5
result.value # => [2, 4, 6, 8, 10]
```

<ul class="execution-trace">
    <li class="continue">1. <code>ValidateSetSize.new(lte: 100)</code></li>
    <li class="continue">2. <code>MultiplyBy.(2)</code></li>
    <li class="continue">3. <code>LimitSet</code></li>
</ul>

## Composing pipelines

Since `Pipeline` itself implements the `#call(Result) Result` interface, it can be used as a step in another pipeline.

```ruby
BigPieline = Pipeline.new do |pl|
  pl.step Step1 # a regular step
  pl.step NumberCruncher # a nested pipeline
  pl.step Step3 # another regular step
end
```

This allows "packaging up" complex processing workflows into reusable components, where each component can be composed of multiple steps if need be.
It's also possible to have factory methods that parameterise the creation of pipelines.

```ruby
# A component to validate and coerce a set of numbers
# It returns a 2-step pipeline that can be composed into a larger pipeline
module NumberValidation
  def self.new(lte:)
    Pipeline.new do |pl|
      pl.step ValidateSetSize.new(lte: lte)
      pl.step CoerceToIntegers
    end
  end

  CoerceToIntegers = proc do |result|
    result.continue(result.value.map(&:to_i))
  end
end

# Compose a larger pipeline
BigPieline = Pipeline.new do |pl|
  pl.step Step1
  pl.step NumberValidation.new(lte: 100) # a nested pipeline
  pl.step Step3
end
```

Pipelines can also be used internally by custom classes.

```ruby
class NumberValidation
  def initialize(lte:)
    @pipeline = Pipeline.new do |pl|
      pl.step ValidateSetSize.new(lte: lte)
      # Use a Method object as step
      pl.step method(:coerce_to_integers)
    end
  end

  # The Step interface
  def call(result) = @pipeline.call(result)

  private def coerce_to_integers(result)
    result.continue(result.value.map(&:to_i))
  end
end
```

Which approach to use will depend on each step's internals. Other than the simple `#call` interface, steps are effective black boxes and refactoring them is straightforward.

## Extending the pipeline

The `Pipeline` class itself can be subclassed or extended to add domain-specific functionality. One that I've found helpful is to add a terse DSL for input validation.

```ruby
NumberCruncher = Pipeline.new do |pl|
  # the #input helper adds a step to validate input
  pl.input do
    field(:limit).type(:integer).required.default(5)
    field(:lte).type(:integer).required
  end

  # ... other steps here
end
```

All `#input` does is register a step using a specialised class that knows how to validate input. That class exposes the `#call(Result) Result` interface, and halts the pipeline if input is invalid.

```ruby
class Pipeline
  # ... etc

  def input(&block)
    step InputValidator.new(&block)
  end
end
```

I use my [Parametric](https://github.com/ismasan/parametric) gem for this, but anything that makes sense for your domain will do. [Dry::Types](https://dry-rb.org/gems/dry-types/) is another good option. Or Rails' [ActiveModel::Validations](https://api.rubyonrails.org/classes/ActiveModel/Validations.html) if you're in a Rails app.

This means that complex operations can now be packaged up and validate their own inputs.

```ruby
# A portable step to multiply each number in the set by a factor.
Multiplier = Pipeline.new do |pl|
  pl.input do
    field(:factor).type(:integer).required.default(1)
  end

  pl.step do |result|
    factor = result.input[:factor]
    result.continue(result.value.map { |n| n * factor })
  end
end

# A portable step to limit the set to the first N elements.
# It defines its own required input.
Limiter = Pipeline.new do |pl|
  pl.input do
    field(:limit).type(:integer).required.default(5)
  end

  pl.step do |result|
    set = result.value.first(result.input[:limit])
    result.continue(set)
  end
end
```

```ruby
NumberCruncher = Pipeline.new do |pl|
  pl.step NumberValidation.new(lte: 100)
  pl.step Multiplier
  pl.step Limiter
end
```

I use helper methods to simplify domain-specific pipelines. Some other examples include:

```ruby
MyPipeline = Pipeline.new do |pl|
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
  pl.debugger
end
```

For most, the implementation is trivial.

```ruby
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

def debugger
  step do |result|
    binding.pry
    result
  end
end
```

## Tracing step positions

As workflows become more complex, it's helpful to have ways to trace and instrospect execution.
For example, when a step halts the pipeline, I would like to know exactly what step it was, and at what depth in the pipeline it sits.

Well deal with the latter first. The following tweaks `Pipeline#call` to keep track of the current step position relative to its parent pipeline.

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

## Middleware

Now we'll add `context[:halted_step]` to the `Result` instance, so that we know exactly what step halted the pipeline.
For that, we'll use a middleware approach. We'll tweak `Pipeline#step` to wrap all registered steps with a middleware that adds the `halted_step` to the result context if the step halts the pipeline.

```ruby
class Pipeline
  # ... etc

  def step(callable, &block)
    callable ||= block
    raise ArgumentError, "Step must respond to #call" unless callable.respond_to?(:call)

    # Wrap the step with a middleware
    callable = StepTracker.new(callable)
    steps << callable
    self
  end
end
```

A middleware step wraps around the execution of another step.

```ruby
class StepTracker < SimpleDelegator
  def call(result)
    step = __getobj__
    result = step.call(result)
    return result.with_context(:halted_step, step) unless result.continue?
    result
  end
end
```

Now, `context[:halted_step]` will be set to the step that halted the pipeline, and `context[:trace]` will be set to the position of that step in the pipeline.

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

A framework-agnostic implementation for that is included in the [code gist]()

> Middleware steps might look similar to regular steps, but they are not.
> Each registered middleware step wraps around every regular step, including in nested pipelines.

## CLIs

A CLI-tailored pipeline class can leverage step tracing to print step positions and halt reasons to the console.

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
    cache_key = result.value.hash # or something else
    # Only call expensive operation if not in cache
    # and store the result in the cache
    @cache.fetch(cache_key) do
      __getobj__.call(result)
    end
  end
end
```

<ul class="execution-trace">
    <li class="warning">1. <code>Expensive Operation 1</code><span class="note">cached</span></li>
    <li class="warning">2. <code>Expensive Operation 2</code><span class="note">cached</span></li>
    <li class="running">3. <code>Expensive Operation 3</code><span class="note">not cached, running</span></li>
    <li>4. <code>ExpensiveOperation4</code><span class="note">pending</span></li>
</ul>

Caching can also be controlled selectively for one or more steps, via a custom sub-pipeline and a helper method.

```ruby
pl.step OkStep
pl.cached do |ch|
  ch.step ExpensiveStep
  ch.step AnotherExpensiveStep
end
pl.step OkStep
```

## Durable execution

## Concurrent execution

## Testability

## Conclusion
