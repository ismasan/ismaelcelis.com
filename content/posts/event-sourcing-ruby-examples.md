+++
draft = false
date = 2022-06-27T17:00:00+01:00
title = "Event Sourcing from the ground up, with Ruby examples, part 1"
description = "In this series I’ll go over the basic concepts in Event Sourcing. The code examples are in Ruby, but the general principles should apply in any language."
images = ["/images/2022/event-sourcing-flow-1.png"]
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

The essential idea is that the state of objects in an app is tracked by a sequence of events describing discrete changes to those objects.
For every state change, an event is produced and appended to a log in storage.
Conversely, the current state of objects in the app is obtained by "replaying" all relevant events from the log and aggregating the described changes onto the object.

![basic event sourcing state management flow](/images/2022/event-sourcing-flow-1.png)

There's no database tables, no SQL joins, no CRUD. Effectively the Audit Trail, an _ordered log of events_, is the canonical data backbone from which all current state is derived.

> This is a strange concept if you come from the CRUD world, but it's actually an omnipresent one: database replication logs and double-entry accounting ledgers all work in a similar way. Git is not event-sourced, but it shows the value of keeping history around.

As an illustration, take your latest bank account statement. The main data structure is an ordered, append-only log of credits and debits to your account. Any current state (your balance) is derived by adding up these historical events, in order.

```
---------------------------------------------
Credits and debits / the "events"
---------------------------------------------
* 2022-06-01T10:00:00 $3000.00 salary
* 2022-06-01T11:20:10 -$5.00 coffee
* 2022-06-02T18:50:00 -$50.50 groceries
* 2022-06-06T18:50:00 -$1000.00 rent
* 2022-06-08T15:00:00 $300.00 tax refund

---------------------------------------------
Balance and aggregations / the "projection"
---------------------------------------------
Balance to date: $2,244.50
Total credits: $3,300.00
Total debits: -$1,055.50
```

Your bank statement is an Event-Sourced entity!

In this series I'll summarise the basic concepts and general interfaces that go into building an event-sourced system, as well as some of the implications to system design.
This post is _not_ about specific libraries, frameworks or implementation details.

## The how of Event Sourcing

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

- [The Event Store interface](/posts/event-sourcing-ruby-event-store/)
- [The Command layer](/posts/event-sourcing-ruby-command-layer/)
- Projections and CQRS
- Reactors and subscribers
