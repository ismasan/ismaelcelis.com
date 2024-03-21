+++
draft = false
date = 2024-03-20T11:00:00Z
title = "Railway-Oriented Pipelines in Ruby pt.2: User input, errors and metadata"
description = "Handling user input, errors and metadata in a Railway-oriented pipeline in Ruby."
images = ["/images/2024/practical-railway-oriented-pipelines-ruby.png"]
slug = "railway-oriented-ruby-result-metadata"
authors = ["Ismael Celis"]
tags = ["ruby", "functional", "pipelines", "composition"]
categories = []
externalLink = ""
series = []
+++

In this series:
* Part 1: [Practical Railway-Oriented Pipelines in Ruby](/posts/practical-railway-oriented-pipelines-in-ruby/)
* **Part 2**: User input, errors and metadata
* Part 3: [Extending pipelines](/posts/railway-oriented-ruby-extending-pipelines/)
* Part 4: [Middleware](/posts/railway-oriented-ruby-middleware/)
* Part 5: [Testing pipelines](/posts/railway-oriented-ruby-testing/)

In the [previous article](/posts/practical-railway-oriented-pipelines-in-ruby/) I described a bare-bones implementation of Railway-oriented pipelines in Ruby.
I showed how to build pipelines of steps that can be executed sequentially, with each step receiving the result of the previous one.

```ruby
# An illustrative data processing pipeline
DataImporter = Pipeline.new do |pl|
  pl.step ValidateUserInput
  pl.step ReadCSV
  pl.step ValidateData
  pl.step TransformData
end
```

## Result metadata

To make these pipelines practical, though, we want to be able to pass extra metadata with the result as it moves through the pipeline, so that we can support a variety of use cases.

```ruby
# Start a result with a dataset value and user input.
result = Result.new([1, 2, 3, 4], input: { limit: 5 })
result.value # => [1, 2, 3, 4]
result.input[:limit] # => 5
```

What those fields are may depend on the domain, but for my use cases I've settled on the following:

* The `value` is the main data being processed. A set of records, an API response, a CSV stream, etc.
* The `input` Hash is meant to pass external user or system input relevant for processing, or to control pipeline behaviour.
* The `errors` Hash is meant to accumulate errors during processing.
* The `context` Hash is meant to pass or accumulate arbitrary data between pipeline steps. Counts, lookups, facets, etc.

```ruby
result = Result.new([1, 2, 3, 4], input: { limit: 5 })
result.input # { limit: 5 }
result.errors # {}
result.context # {}
```

Then I add helper methods such as `#with_context` and `#with_error` as well as `#halt` and `#continue` to help manipulate result instances as they move through the pipeline.

### Passing context between steps

```ruby
result = result.with_context(:count, 4)
# result.context[:count] # 4
```

### Accummulating errors while allowing the pipeline to continue

```ruby
result = result.with_error(:limit, "Exceeded")
# result.continue? => true
# result.errors => { limit: ["Exceeded"] }
```

### Halting with errors

```ruby
result = result.halt.with_error(:limit, "Exceeded")
# result.continue? => false
# result.errors => { limit: ["Exceeded"] }
```

### Combining helpers

```ruby
result = result
            .halt([]) # <= halt with an empty value
            .with_error(:limit, "Exceeded") # <= add an error
            .with_context(:count, 4) # <= add context
```

Note that these helpers are not required for the pipeline to work. They're just syntax sugar to make working with `Result` instances more convenient.

> All of these methods, as well as `#continue` and `#halt`, **return new instances**, leaving the original untouched. Inmutable results means no risk of a step accidentaly modifying an object that might be used elsewhere in the code.
> It also enables concurrent execution of steps, as we'll see later.

Let's add a step to limit the set to the first N elements based on user input. It will also validate that the limit is set.

```ruby
LimitSet = proc do |result|
  if (limit = result.input[:limit])
    set = result.value.first(result.input[:limit])
    result.continue(set)
  else # No limit! Halt with an error.
    result.halt.with_error(:limit, "Not set")
  end
end

NumberCruncher = Pipeline.new do |pl|
  # ... Previous steps here
  pl.step LimitSet # <= this step expects input[:limit]
end

initial_result = Result.new((1..100), input: { limit: 5 })
result = NumberCruncher.call(initial_result)
result.value # =>[2, 4, 6, 8, 10]
```

<ul class="execution-trace">
    <li class="continue">1. <code>Logging</code></li>
    <li class="continue">2. <code>ValidateSetSize.new(lte: 100)</code></li>
    <li class="continue">3. <code>MultiplyBy.(2)</code></li>
    <li class="continue">4. <code>LimitSet</code></li>
</ul>

Ommitting the `limit` input will halt the pipeline with an error.

```ruby
initial_result = Result.new((1..100), input: {})

result = NumberCruncher.call(initial_result)
result.continue? # => false
result.errors # => { limit: ["Not set"] }
```

<ul class="execution-trace">
    <li class="continue">1. <code>Logging</code></li>
    <li class="continue">2. <code>ValidateSetSize.new(lte: 100)</code></li>
    <li class="continue">3. <code>MultiplyBy.(2)</code></li>
    <li class="halt">4. <code>LimitSet errors: {limit: ['Not set']}</code></li>
</ul>

`input` can be used for filtering lists, setting limits, defining transformations, etc. It's a flexible way to pass user input to the pipeline.

## Input validation steps

It's possible to implement steps specialised in validating input and populatin errors.
These steps can be put at the front of a pipeline, to ensure that no further steps run if the input is invalid.

```ruby
class ValidateInputPresence
  def initialize(field)
    @field = field
  end

  def call(result)
    return result.halt.with_error(@field, "Not set") if result.input[@field].nil?

    result
  end
end

NumberCruncher = Pipeline.new do |pl|
  pl.step ValidateInputPresence.new(:limit)
  pl.step LimitSet # <= this step expects input[:limit]
end
```

There's no constraint to the kinds of APIs or DSLs exposed by these steps. A more complex example could for example leverage [Rails' attributes API](https://api.rubyonrails.org/classes/ActiveModel/Attributes.html)

How exactly that step implements validations is not important, as long as it responds to `#call` and returns a `Result` with the relevant errors.

```ruby
pl.step(ValidateInputs.new do
  attribute :limit, :integer
  attribute :order, :string, default: "asc"

  validates :limit, presence: true, numericality: { greater_than: 0 }
  validates :order, inclusion: { in: %w[asc desc] }
end)
```

In the next article I'll show more examples, when I talk about extending pipelines with specialised steps and helper methods.

## Context is king.

I showed `input` and `errors`. `context` is a intended for steps to pass data between each other, or to accumulate data as the pipeline progresses.
The following step computes a count of odd numbers in the set, and passes it to the next step.

```ruby
CountOdds = proc do |result|
  count = result.value.count(&:odd?)
  result.with_context(:odd_count, count)
end
```

This other step processes a list of user records, and builds facet counts for each country.

```ruby
# data looks like:
#
# [
#   { name: "Alice", country: "US" },
#   { name: "Bob", country: "UK" }
#   ...
# ]
FacetByCountry = proc do |result|
  hash = Hash.new { |h, country| h[country] = 0 }
  counts = result.value.each.with_object(hash) do |user, h|
     h[user[:country]] += 1
  end
  result.with_context(:country_facets, counts)
end

# The pipeline
UserProcessor = Pipeline.new do |pl|
  pl.step FacetByCountry
  pl.step FilterByCountry # .. etc
end

# Example
initial_result = Result.new(users)
result = UserProcessor.call(initial_result)
result.context[:country_facets] # => { "US" => 10, "UK" => 5, ... }
```

I'll rely on `input`, `errors` and `context` throughout the series to show how to build complex pipelines that can handle a variety of use cases.

