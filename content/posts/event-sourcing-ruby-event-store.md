+++
draft = false
date = 2022-06-28T10:00:00+01:00
title = "Event Sourcing with Ruby examples. The Event Store interface."
description = "Event Sourcing explained, with Ruby examples: The Event Store interface."
slug = ""
authors = ["Ismael Celis"]
tags = ["ruby", "design patterns", "eventstore", "eventsourcing", "cqrs"]
categories = []
externalLink = ""
series = []
+++

> This is part of a series on Event Sourcing concepts, with Ruby examples.
Read the first part: [Event Sourcing from the ground up, with Ruby examples, part 1](/posts/event-sourcing-ruby-examples/).

The Event Store interface is the canonical data store in event sourcing, and it’s in charge of persisting and retrieving events produced by your system.

```typescript
#append_to_stream(stream_id String, events List<Event>) boolean
#read_from_stream(stream_id String) List<Event>
```

The `stream_id` is the identity of an entity in your domain. A Product, User, Shopping Cart, Account, etc. Whatever entity whose state you want to track via a log of sequential events.

```ruby
EventStore.append_to_stream("product-123", product_events)
```

Events for a single entity can now be reconstituted from storage into the current state of a product entity.

```ruby
# Ordered list of events for a single product
events = EventStore.read_from_stream("product-123")
product = events.reduce(blank_product, &projector)
```

Things to note:

- The EventStore guarantees event ordering for a single `stream_id` (entity). This is usually done by tagging stored events with a per-stream incremental sequence number. Per-entity event streams can be thought of (and are usually implemented as) discrete storage partitions with guaranteed ordering.
- In other words, at the domain level the Entity should be thought of as the “transactional unit”, where the order of events matters. An `UserUpdated` event can’t ever happen after `UserDeleted` for the same User entity, but the exact order in which those two event types were issued for different user entities is not critical, and not a practical guarantee at scale.
- I’m calling the argument `stream_id` and not `entity_id`, even if it most likely will refer to a specific entity (ex. a specific product) in your system. However, from the standpoint of the Event Store interface, it doesn’t actually need to know that a stream of events will be used to reconstitute a domain entity. All it cares about it storing and retrieving an ordered stream of events. Later we’ll see that event streams can also be used to track broader projections in a system, ex. “sales report 2022”.

### Optimistic locking

Some Event Store implementations allow you to check for concurrent write errors. For example, when two separate threads or processes attempt to append different events to the same stream at the same time.

This is normally done by exposing a *sequence* number on each event. You’re then required to pass the last sequence number known to the local thread when appending new events.

```ruby
events = EventStore.read_from_stream("product-123")
last_sequence_number = events.last.sequence_number
# EventStore will make sure that per-entity sequence numbers are unique and ordered
EventStore.append_to_stream(
  new_events,
  last_sequence_number: last_sequence_number
)
# Raises an error if another thread already committed events after this
# sequence number
```

### Time travelling

The fact that entities are derived from historical events gives you the abilitity to reconstitute entity state up to an arbitrary point in time.
An Event Store implementation can optionally support a target sequence number, or an event ID, up to which to project an entity.

```ruby
events = EventStore.read_from_stream("product-123", upto_sequence: 20)
# This shows how a product looked like at the 20th event.
product = events.reduce(blank_product, &projector)
```

Apps can pair this with a GUI to show and navigate an entity's history.

![Demo time travelling UI](/images/2022/event-sourcing-time-travelling.gif)

☝️ A demo UI for a time-travelling, event-sourced shopping cart.

### Next:

Technically we’ve now covered the totality of Event Sourcing: apply a sequential list of events to an initial state to get at a new entity state. Provide a simple interface to read and write events to storage, partitioned by entity/streams.

But we need quite a lot more concepts for Event Sourcing to be usable in real systems.

- The Command layer
- Projections and CQRS
- Reactors and subscribers

