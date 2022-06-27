+++
draft = false
date = 2022-06-27T17:00:00+01:00
title = "Event Sourcing from the ground up, with Ruby examples, part 1"
description = "Event Sourcing explained, with Ruby examples"
slug = ""
authors = ["Ismael Celis"]
tags = ["ruby", "design patterns", "functional", "eventsourcing", "cqrs"]
categories = []
externalLink = ""
series = []
+++


In this series I'll go over the basic concepts in Event Sourcing.
The code examples are in Ruby, but the general principles should apply in any language.

## What's Event Sourcing

At its core, Event Sourcing consists of a single function that, given an initial state and an “event”, returns an updated version of the state.

```
#call(state, event) -> state
```

“State” can be anything that captures domain-specific data. For example a simple struct

```ruby
Product = Struct.new(:name, :price)
product = Product.new('iPhone', 1200)
```

But also a regular Hash

```ruby
product = { name: 'iPhone', price: 1200 }
```

I’ll call these pieces of state “entities”, as they should model domain entities in your system, and they will be a version of [Entity objects](https://blog.jannikwempe.com/domain-driven-design-entities-value-objects#heading-entities) more often than not.

“Event” is an object that signifies something that happened in the system, and any data needed to describe what happened.

```ruby
PriceUpdated = Struct.new(:price)
```

The function takes the current state, the event, and “projects” the event into a new state.

So:

```ruby
ProductProjector = proc do |product, event|
  case event
  when PriceUpdated
    product.merge(price: event.price)
  else
    product
  end
end
```

Given a product, and a `PriceUpdated` event, the _projector_ function returns a new product with the updated price.

```ruby
product = ProductProjector.call(product, PriceUpdated.new(1100))
# product[:price] is now 1100
```

The resulting state of projecting events is sometimes called a “projection”.

Given a list of events, and a projector function that knows how to handle them, you can always arrive at the same final state by replaying events on an initial blank state.

```ruby
blank_product = { name: '', price: 0, brand: '' }
events = [
  ProductCreated.new(name: 'iPhone'),
  PriceUpdated.new(price: 1200),
  BrandUpdated.new(brand: 'Apple'),
  PriceUpdated.new(price: 1100)
]

# Reduce over events and update product state
product = events.reduce(blank_product) do |pr, event|
  ProductProjector.call(pr, event)
end

# Our example projector is a Proc, so we can also just do:
product = events.reduce(blank_product, &ProductProjector)
```

A few things to note:

- Entity objects are purely in-memory. They just represent the current state of a domain entity. They’re often referred to as [aggregates](https://martinfowler.com/bliki/DDD_Aggregate.html), but they don’t need to conform to that pattern.
- Events are always *in the past*. They refer to things that have already happened. Any validations or checks needed to produce an event should happen as a pre-requisite to producing it, normally in a “command layer”, but really anywhere it makes sense in your system (an MVC controller action, a policy object, etc).
- For the reason above, event projectors should not run validations. **Events are assumed to be valid**, and a projector should just apply them to the state.
- Projector functions are *pure* (given the same state and event, they return the same new state),  with no side-effects, and by extension processing a list of events is *deterministic*: for the same initial state and events, we always arrive at the same final state.
- This pattern guarantees a 100% accurate audit trail, with no information loss, because by definition domain entities are derived from events, and not the other way around.
- Note that there’s no persistence anywhere in this workflow. That’s the job of an Event Store interface, which I’ll describe later. For the most part, your domain logic can assume it’s dealing with purely in-memory objects.

### In the wild: entity and projector mashups

Some Event Sourcing libraries in various languages merge together entities and their projector function, such that you project events onto an entity by passing event instances to a method in the entity (they also tend to call entities “aggregates”, which is a bit misleading).

```ruby
product = ProductEntity.new
product.apply PriceUpdated.new(1000)
product.price # 1000
```

Personally I think that’s an unnecessary blurring of boundaries that also requires extra infrastructure in you entity code (inherit from a super-class, mix in a module, or provide a specific interface). Entities are your domain objects, and therefore you should be able to implement them as you see fit.

Regardless, at a conceptual level there’s a separation of concerns here: entities represent objects in your domain. Projectors handle events to update entities.

### Next:

- The EventStore interface
- The Command layer
- Projections and CQRS
- Reactors and subscribers
