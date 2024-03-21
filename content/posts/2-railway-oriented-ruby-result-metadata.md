+++
draft = false
date = 2024-03-20T11:00:00Z
title = "Railway-Oriented Pipelines in Ruby pt. 2: User input, errors and metadata"
description = "Handling user input, errors and metadata in a Railway-oriented pipeline in Ruby."
images = ["/images/2024/practical-railway-oriented-pipelines-ruby.png"]
slug = ""
authors = ["Ismael Celis"]
tags = ["ruby", "functional", "pipelines", "composition"]
categories = []
externalLink = ""
series = []
+++

## Result metadata

What's described above is the essence of the Railway-oriented paradigm. But passing extra metadata with the result can be useful to support a variety of use cases.

```ruby
# Start a result with a dataset value and user input.
result = Result.new([1, 2, 3, 4], input: { limit: 5 })
result.value # => [1, 2, 3, 4]
result.input[:limit] # => 5
```

What those fields are may depend on the domain, but for my use cases I tend to use the following:

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

Let's add a step to limit the set to the first N elements based on user input.

```ruby
LimitSet = proc do |result|
  set = result.value.first(result.input[:limit])
  result.continue(set)
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

