+++
draft = false
date = 2024-03-20T14:00:00Z
title = "Railway-Oriented Pipelines in Ruby pt. 5: Testing pipelines"
description = "Testing Railway-oriented pipelines in Ruby."
images = ["/images/2024/railway-oriented-pipelines-ruby-testing.png"]
slug = "railway-oriented-ruby-testing"
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
* Part 4: [Middleware](/posts/railway-oriented-ruby-middleware/)
* **Part 5**: Testing pipelines

## Testing pipelines.

Testing any complex workflow can be challenging. Composable pipelines can make it easier to use a "divide and conquer" approach to testing.

### 1. Unit test each step in isolation.

Steps may or may not be complex, but their simple `#call(Result) Result` interface makes them easy to test.

```ruby
step = MultiplyBy.(2)
initial_result = Result.new([1, 2, 3, 4])
result = step.call(initial_result)

expect(result.continue?).to be(true)
expect(result.value).to eq([2, 4, 6, 8])
```

You can test that specialised steps add the right metadata to the result.

```ruby
step = ParamsValidatorStep.new do |schema|
  schema.field(:limit).type(:integer).required
end

initial_result = Result.new([], params: { limit: 'nope!' })
result = step.call(initial_result)

expect(result.continue?).to be(false)
expect(result.errors[:limit][0]).to eq('must be an integer')
```

### 2. Test that the pipeline is composed correctly.

```ruby
# An RSpec helper to assert that a pipeline is composed of a sequence of steps
expect(NumberCruncher).to be_composed_of_steps(
  ValidateSetSize,
  MultiplyBy.(2),
  LimitSet
)
```

Such an RSpec matcher basically needs to compare the given steps with `Pipeline#steps`.

You can of course test an entire pipeline end-to-end, in much the same way you'd test an individial step.

```ruby
initial_result = Result.new([1, 2, 3, 4], params: { limit: 5 })
result = NumberCruncher.call(initial_result)

expect(result.continue?).to be(true)
expect(result.value).to eq([2, 4, 6, 8])
```

There really isn't a lot more to it.

A big caveat is that whether a step has side effects (calling a database, an external API, the file system, etc) is up to you (unless you stick to functional patterns and avoid side effects, which is not a given).
In that case you'd setup and test those dependencies accordingly, like you'd do with other similar cases.

