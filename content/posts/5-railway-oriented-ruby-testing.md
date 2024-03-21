+++
draft = false
date = 2024-03-20T14:00:00Z
title = "Railway-Oriented Pipelines in Ruby pt. 5: Testing pipelines"
description = "Testing Railway-oriented pipelines in Ruby."
images = ["/images/2024/practical-railway-oriented-pipelines-ruby.png"]
slug = ""
authors = ["Ismael Celis"]
tags = ["ruby", "functional", "pipelines", "composition"]
categories = []
externalLink = ""
series = []
+++

## Testability

Testing any complex workflow can be challenging. Composable pipelines allows me to use a "divide and conquer" approach to testing.

1. Unit test each step in isolation.

```ruby
step = MultiplyBy.(2)
initial_result = Result.continue([1, 2, 3, 4])
result = step.call(initial_result)

expect(result.value).to eq([2, 4, 6, 8])
```

2. Test that the pipeline is composed correctly.

```ruby
# An RSpec helper to assert that a pipeline is composed of a sequence of steps
expect(NumberCruncher).to be_composed_of_steps(
  ValidateSetSize,
  MultiplyBy.(2),
  LimitSet
)
```

