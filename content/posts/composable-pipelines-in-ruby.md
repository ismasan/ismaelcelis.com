+++
draft = false
date = 2021-10-14T11:32:35+01:00
title = "Railway-style composable pipelines in Ruby"
description = "Composable data pipelines in Ruby, using Railway-oriented programming"
slug = ""
authors = ["Ismael Celis"]
tags = ["ruby", "design patterns", "functional", "pipelines", "composition", "declarative"]
categories = []
externalLink = ""
series = []
+++

An exploration of patterns for building composable data pipelines in Ruby, from the basics to the possibly YAGNI.

### Function composition

Ruby's [function composition](https://thoughtbot.com/blog/proc-composition-in-ruby) allows you to neatly chain Procs together using the `#>>` operator.

```ruby
DISCOUNT = 200
substract_discount = ->(amount) { amount - DISCOUNT }

TAX_RATE = 0.19
add_tax = ->(amount) { amount * (1 + TAX_RATE) }

calculate_total = substract_discount >> add_tax

calculate_total.call(1000) # 952.0
```

`#>>` (and its inverse, `#<<`) are implemented in procs and [method objects](https://ruby-doc.org/core-3.0.2/Method.html), so it's possible to write class-based steps.

```ruby
class Discount
  def initialize(discount)
    @discount = discount
  end

  def call(amount)
    amount - @discount
  end

  def >>(other)
    method(:call) >> other
  end
end

calculate_total = Discount.new(200) >> add_tax
calculate_total.call(1000) # 952.0
```

### A problem: error handling

Let's say we want to validate that discounts aren't greater than amounts, and treat that case as an error scenario.

```ruby
DISCOUNT = 200
substract_discount = ->(amount) {
  if DISCOUNT > amount
    # What now?
  else
    amount - DISCOUNT
  end
}
```

What now indeed. We could raise an exception.

```ruby
if DISCOUNT > amount
  raise DiscountGreaterThanAmountError, \
    "discount of #{DISCOUNT} is greater than amount #{amount}"
```

But that means that client code needs to be aware of all the possible error cases.

```ruby
begin
  result = calculate_total.call(100)
rescue DiscountGreaterThanAmountError => ex
  # handle error here
end
```

Add specialised exceptions for different steps, and things get unwieldy.

```ruby
rescue DiscountGreaterThanAmountError
rescue AmountTooSmallError
rescue AmountIsNotNumberError
rescue Etc
```

You get the idea. Pipelines should allow you to treat each step as interchangeable little black boxes. Handling errors in this way just leaks individual step details to the client code.

We could instead return a special error object.

```ruby
if DISCOUNT > amount
  Error.new('amount is greater than amount')
else
  amount - DISCOUNT
end
```

The problem here is that this forces all steps downstream to handle errors.

```ruby
add_tax = ->(amount_or_error) {
  if amount_or_error.is_a?(Error)
    # pass the error as-is?
    amount_or_error
  else
    amount_or_error * (1 + TAX_RATE)
  end
}
```

There’s a better way.

### Railway oriented pipelines

Let's take a step back (pun intended). The happy-path examples above work because all steps in the pipeline expect the same type (numeric, in this case).
But we now want to incorporate errors into our possible results. We need to wrap our values in a uniform interface that supports expressing  errors. That’s a result object.

```ruby
class Result
  attr_reader :value

  def initialize(value)
    @value = value
  end

  class Success < self
  end

  class Failure < self
    attr_reader :error

    def initialize(value = nil, error = nil)
      super(value)
      @error = error
    end
  end
end
```

A result wraps a value and exposes it as `#value`.
Subclass `Result::Success` represents a successful result. `Result::Failure` is the failed case and also includes an optional `#error`.
Let's now refactor our pipeline steps to take a `Result::Success` as argument, and return a `Result::Success` or `Result::Failure`.

```ruby
# new interface: #call(Result::Success) Result::Success | Result::Failure
substract_discount = ->(result) {
  if DISCOUNT > result.value
    Result::Failure.new(result.value, 'discount is greater than amount')
  else
    Result::Success.new(result.value - DISCOUNT)
  end
}
```

And the same for `add_tax`.
Now the key: each `Result` subclass implements a `#map(callable)` Result interface.

```ruby
class Success < self
  def map(callable)
    callable.call(self)
  end
end

class Failure < self
  def map(callable)
    self
  end
end
```

What's all this about? It means that we can now chain pipeline steps using result sub types as glue.

```ruby
# Happy path
Result::Success.new(1000)
  .map(substract_discount)
  .map(add_tax)
# Returns Success(952)

# Error path
Result::Success.new(100)
  .map(substract_discount)
  .map(add_tax)
# Returns Failure(100, 'discount is greater than amount')
```

Note that, in the error case, `add_tax` was never applied. This is because `substract_discount` returns a `Result::Failure`, which then maps to `add_tax` as

```ruby
def map(add_tax)
  self
end
```

In other words, a failure result returns itself without ever calling the next step. This means that the first failure encountered short-circuits the pipeline, forwarding the failure object all the way to its other end.
This is sometimes called [Railway oriented programming](https://vimeo.com/113707214), because it conceptually separates data flow into distinct success and failure "tracks".

![Railway oriented programming](/images/2021/railway-oriented-programming.png)

In the (professionally drawn) diagram above, once R2 returns a failure, it is propagated to the end of the pipeline, skipping R3, R4 and R5.

> The FP-curious reader might notice that this Result implementation is a type of monad.
Depending on your domain you might want to use an [Option type](https://en.wikipedia.org/wiki/Option_type) instead, for example when processing lists where the output can be either a new list ("Some") or an empty list ("None"). See [this nice blog post](https://medium.com/@baweaver/functional-programming-in-ruby-flow-control-565bbdcdf2a2) for more in-depth Ruby examples. You might also be reminded of Promises in various languages, which share a lot with this approach.

### Back to declarative

Great, result objects give us a generic way to handle errors at any point in pipelines, but we've lost the ability to compose steps declaratively, for reuse or configuration , using the `#>>` operator. Let's add that back in.

But before that, let's add a helper to wrap regular values into `Result::Success` instances.

```ruby
class Result
  def self.wrap(value)
    value.is_a?(Result) ? value : Success.new(value)
  end
end
# Usage:
# result = Result.wrap(1000) # returns a Result::Success
# result.value # 1000
```

We'll have a `Chain` class to map two callables via `Result#map`.

```ruby
class Chain
  def initialize(left_callable, right_callable)
    @left_callable = left_callable
    @right_callable = right_callable
  end

  def call(result)
    Result.wrap(result).map(@left_callable).map(@right_callable)
  end
end
```

It glues two steps together as a single callable exposing the same `#call(Success) Success | Failure` interface.
A successful result from the first step is piped as input to the second one.
Failures are returned as-is.

```ruby
calculate_total = Chain.new(substract_discount, add_tax)
calculate_total.call(1000) # Success(952.0)
calculate_total.call(100) # Failure(100, 'Discount is greater than amount')
```

Now we'll create a `Chainable` mixin to implement `#>>`.

```ruby
module Chainable
  def >>(other)
    Chain.new(self, other)
  end
end

# Chain is chainable
class Chain
  include Chainable
  # ..etc
end
```

Chains can produce new chains:

```ruby
calculate_total = Chain.new(substract_discount, add_tax)
total_with_offer = calculate_total >> add_special_offer
```

Finally, we'll create a `Step` class to wrap our custom steps and make them _chainable_.

```ruby
class Step
  include Chainable

  # Accept a block, or anything that responds to #call
  def initialize(callable = nil, &block)
    @callable = callable || block
  end

  def call(result)
    @callable.call(Result.wrap(result))
  end
end
```

This gives us:

```ruby
substract_discount = Step.new do |result|
  if DISCOUNT > result.value
    Result::Failure.new(result.value, 'discount is greater than amount')
  else
    Result::Success.new(result.value - DISCOUNT)
  end
end

add_tax = Step.new { |result| ... etc }

calculate_total = substract_discount >> add_tax
# produces Chain(substract_discount, add_tax)
calculate_total.call(1000) # Success(952.0)
```

Note that any callable can be made pipeline-compatible.

```ruby
custom_step = Step.new(MyCustomCallable.new)
pipeline = some_step >> custom_step >> some_other_step
```

### Some syntax sugar

Since instantiating `Result::Success` or `Result::Failure` will be commonplace within step implementations, let's add a convenience to `Result::Success`.

```ruby
class Success < self
  # ...etc
  def success(value)
    Success.new(value)
  end

  def failure(val = value, error)
    Failure.new(val, error)
  end
end
```

This is just so that we have the shorter `result.success(new_value)` and `result.failure('something bad happened')` available in our steps.

Note that these additions are only required in `Result::Success`, as that's the only type ever passed to step callables.

### Possibility 1: declarative Pipeline class

We can add some extra infrastructure to have portable pipeline definitions.

```ruby
pipeline1 = Pipeline.new do |pl|
  # register steps as callables
  pl.step Discount.new(200)
  pl.step Tax.new(0.19)
  # ... or blocks
  pl.step do |result|
    Logger.info "Got #{result.inspect}"
    result
  end
end

result = pipeline1.call(1000) # Result::Success(952.0)
```

The implementation goes something like this.

```ruby
class Pipeline
  def initialize
    # Start with a no-op step
    @chain = Step.new { |result| result }
  end

  def step(callable = nil, &block)
    @chain = @chain >> Step.new(callable || block)
  end

  def call(value)
    @chain.call(value)
  end
end
```

`Pipeline` is itself composable, since it implements the same `#call(Success) Success | Failure` interface.

```ruby
pipeline2 = Pipeline.new do |pl|
  pl.step pipeline1 # treat a Pipeline like a regular Step
  pl.step FinalStep
end
```

We can add some nice little helpers on top of `#step`.

```ruby
# Pipeline
def debug!
  step do |result|
    byebug
  end
end

def log(label)
  step do |result|
    Logger.info "[#{label}] #{result.inspect}"
    result
  end
end
```

Use case:

```ruby
pipeline = Pipeline.new.tap do |pl|
  pl.log 'before discount'
  pl.step Discount.new(200)
  pl.log 'after discount'
  pl.step Tax.new(0.19)
  pl.debug!
end

pipeline.call(1000)
```

This could be a nice little abstraction for middleware-style pipelines.

### Possibility 2: pseudo (runtime) type system

> What follows builds on the infrastructure described above, and is inspired by the [Dry-*](https://dry-rb.org/gems/dry-types/master/) set of Ruby gems. For real-world use of these ideas you can refer to those libraries, which are mature and heavily optimised for performance.

Let's start with a no-op step as a base to compose more specialised behaviour. This is the identity monad in the functional world.

```ruby
Noop = Step.new { |result| result }
```

Let's now add some extra conveniences to our `Chainable` mixin (the one that affords `#>>` to `Step` and `Chain`).

#### `#transform`

```ruby
module Chainable
  # .. etc
  def transform(callable = nil, &block)
    transformation = ->(result) {
      new_value = callable.call(result.value)
      result.success(new_value)
    }
    # Pipe self to transformation step
    # returning a new Chain
    self >> transformation
  end
end
```

This is just a shortcut for value-transformation pipelines where the operations are assumed to be successful. An example for coercible values:

```ruby
to_int = Noop.transform { |value| value.to_i }
# This works, too:
to_int = Noop.transform(&:to_i)
# This returns Chain(Noop, transform)

# Now use it in other pipelines
calculate_total = to_int >> substract_discount >> add_tax
```

#### `#check`

Quick boolean check on a result's value.

```ruby
module Chainable
  def check(err = 'did not pass the check', &block)
    a_check = ->(result) {
      block.call(result.value) ? result : result.failure(err)
    }
    self >> a_check
  end
end
```

Usage:

```ruby
is_a_string = Noop.check('not a string') { |value| value.is_a?(String) }
is_a_string.call('yup') # Success('yup')
is_a_string.call(10) # Failure('not a string')
```

#### `#is_a`

Simple type check on top of `#check`.

```ruby
module Chainable
  def is_a(klass)
    check("is not a #{klass}") { |value| value.is_a?(klass) }
  end
end
```

This one allows us to type-check input values, or return a `Failure` early on in a pipeline.

```ruby
must_be_numeric = Noop.is_a(::Numeric)
calculate_total = must_be_numeric >> substract_discount >> add_tax
calculate_total.call('nope!') # Result::Failure('is not a Numeric')
```

#### `#|`

Here we implement the `or` logical operator by returning a custom callable.

```ruby
module Chainable
  # Disjunction operator (or)
  # return an Or instance
  def |(other)
    Or.new(self, other)
  end
end

class Or
  include Chainable

  def initialize(left_callable, right_callable)
    @left_callable = left_callable
    @right_callable = right_callable
  end

  # if left callable returns Success, return it.
  # Otherwise try right callable.
  def call(result)
    result = @left_callable.call(result)
    result.is_a?(Result::Success) ? result :
      @right_callable.call(result.success)
  end
end
```

Use case:

```ruby
int_or_string = Noop.is_a(Integer) | Noop.is_a(String)
int_or_string.call(10) # Success(10)
int_or_string.call('yup!') # Success('yup!')
int_or_string.call({}) # Failure('{} is not a String')
```

With these helpers in hand, we could, if pressed, devise a kind of runtime type system.

```ruby
module Types
  String = Noop.is_a(::String)
  Numeric = Noop.is_a(::Numeric)
  Nil = Noop.is_a(::NilClass)
  True = Noop.is_a(::TrueClass)
  False = Noop.is_a(::FalseClass)
  # etc
end
```

We can now combine these base "types" into other types. Here's a "Boolean":

```ruby
module Types
  Boolean = True | False
end

Types::Boolean.call(true) # Success(true)
Types::Boolean.call(false) # Success(false)
Types::Boolean.call('nope') # Failure
```

And here's a [Maybe type](https://en.wikipedia.org/wiki/Option_type):

```ruby
maybe_string = Types::Nil | Types::String

maybe_string.call('yes!') # Success('yes!')
maybe_string.call(nil) # Success(nil)
```

As you can see, we're using disjunctions (the `|` operator) as a kind of runtime [Union type](https://en.wikipedia.org/wiki/Union_type).

We can now combine basic, custom types and operators into complex logic:

```ruby
require 'money'

module Types
  Money = Noop.is_a(::Money)
end

# Coerce an integer into a Money instance
int_to_gbp = Types::Integer.transform{ |int| Money.new(int, 'GBP') }
# Is it already USD?
is_usd = Types::Money.check { |amount| amount.currency.code == 'USD' }
# Exchange to USD
to_usd = Types::Money.transform { |amount| amount.exchange_to('USD') }

# Check minimum money amount
gte = ->(cents) {
  Types::Money.check("must be >= than #{cents} cents") { |amount| amount.cents >= cents }
}

# * If it's an Integer, convert into GBP Money instance
# * else if it's already a Money
#   * if already USD, stop
#   * else convert to USD
# * finally validate that it's greater or equal than $1000.00
money = (int_to_gbp | Types::Money) >> (is_usd | to_usd) >> gte(1000_00)

money.call(1000_10) # Success(Money(1_368_58, 'USD'))
money.call(Money.new(1000_00, 'USD')) # Success(Money(1000_00, 'USD'))
money.call(999_99) # Failure("must be >= than 100000 cents")
money.call('nope') # Failure('is not a Money')
```

### Advanced "types": Arrays, hashes

The basic `Step` class can also be subclassed to handle composite type definitions.

```ruby
array_of_strings_or_numbers = Types::Array.of(Types::String | Types::Numeric)

Birthday = Types::String.check('not a date') { |str| str =~ /\d{4}-\d{2}-\d{2}/ }

user_hash = Types::Hash.schema(
  name: Types::String,
  birthday: Birthday
)
```

And a long _etc_. Other examples include checking specific values, interfaces, concurrent processing of arrays.
The [Dry-Types](https://dry-rb.org/gems/dry-types/master/) project and related gems are a good showcase of where we can take these patterns in Ruby.

