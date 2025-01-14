---
draft: true
title: "Dead Code Podcast Notes"
date: 2025-01-14T11:55:54Z
authors: ["Ismael Celis"]
tags: ["podcast", "eventsourcing", "cqrs"]
description: "Notes from the Dead Code Podcast"
images: ["/images/2025/2025-01-dead-code-podcast-notes.png"]
---

I was recently invited to chat at the [Dead Code podcast](https://shows.acast.com/dead-code) (thank you for the invite!), about Event Sourcing and Ruby. Here are some notes (and corrections!) from the conversation.

<!--more-->

I enjoyed the conversation and I hope it was useful to some people. In an attempt to pack as much context as possible I did get a bit ramble-y at times, and didn't manage to touch on some important topics.

### Corrections

* I mentioned Jeremie Chassaing's excellent blog post [Functional Event Sourcing Decider](https://thinkbeforecoding.com/post/2021/12/17/functional-event-sourcing-decider), but I said the examples were in C# when I should have said F#. I was speaking _out of tune_, if you will 🥁.

* I gave _commands_ perhaps more emphasis than I should have. I've written about [the command layer](/posts/event-sourcing-ruby-command-layer/) as a general abstraction before, and its [different interpretations](/posts/what-do-commands-do-in-event-sourcing/) in Event Sourcing. But the role of commands is actually a bit of a hot topic in some quarters, and I should have focused a bit more on the "core" pattern around [state and events](/posts/event-sourcing-ruby-examples/).

* I repeatedly referred to the notion of a "flat" mental model, in opposition to RDBMS-driven CRUD models that can often lead to "deep" object hierarchies with complex networks of inter-related concepts. I should have used the word "shallow" instead.

### What I didn't talk about

So much!

#### CQRS

While Event Sourcing on its own is only concerned with "sourcing" current state from events, <a href="https://martinfowler.com/bliki/CQRS.html" title="Command Query Responsibility Segregation">CQRS</a> provides the architectural scaffolding around it to make it usable in most systems. How do you _query_ event-sourced data? How to you handle side-effects? How do you build UIs?

#### Eventual Consistency

You can definitely use Event Sourcing in _immediately consistent_ systems, but where it really shines (in my opinion) is when you abandon the illusion of consistency across domain boundaries and embrace the [eventually-consistent](https://en.wikipedia.org/wiki/Eventual_consistency) relationships between reality and software designed to represent it. 

I briefly touched on the example of products in a warehouse getting stolen, lost or broken while the software still thinks they're available to sell. It doesn't matter how careful you are about your database transactions: **reality will always get out of sync with your data**, and Event Sourcing offers both a mental model and a mechanism to manage and compensate for those scenarios.

#### Concurrency boundaries

In most <abbr title="Create, Read, Update, Delete">CRUD</abbr> systems, concurrency is an implementation detail, usually handled in configuration. In Event Sourcing, concurrency is elevated to a first-class component of the mental model, because command handlers (or "deciders", the bit of the architecture where you guard domain invariants and produce new events) exist as little islands of guaranteed consistency in a sea of eventual consistency (see above). This makes these components the natural "units of concurrency". Not dissimilar from [the Actor Model](https://en.wikipedia.org/wiki/Actor_model).

It's in fact concurrency and eventual consistency that I've been trying to explore in my [Sourced](https://github.com/ismasan/sourced?tab=readme-ov-file#concurrency-model) library, as early-stages as it is at the time of this writing.

#### Durable execution

Durable execution is the idea that you can split an operation into small idempotent steps, and persist the state of each step as it progresses. If one of the steps crashes, you can seamlessly retry the operation from the last persisted state "checkpoint". 
Event Sourcing can lend itself for this kind of approach pretty naturally, as operations can be modeled as workflows where each "step" leaves behind a trail of events that can be replayed to reconstitute the state of the operation at any point in time. 

#### Modeling and documentation

The way in which Event Sourcing can make the domain model "shallower" by decoupling concepts can also make it easier to model and diagram the domain before even writing any code. Instead of complex UML diagrams you can describe the entire behaviour of a system in terms of events that happen in the domain. This is the drive behind [Event Storming](https://www.eventstorming.com) and [Event Modeling](https://eventmodeling.org), and I recommend looking into those.

The inverse is also true: given the right affordances in your code, Event Sourcing can make it easier to generate diagrams and documentation from it. Also something I've been exploring in my code.

#### Some resources

* [This](https://www.youtube.com/watch?v=AEbBCjo-WGM) is an excellent and short video series explaining the general ES/CQRS set of patterns.
* The [DDD-CQRS-ES](https://discord.gg/sEZGSHNNbH) Discord is full of helpful people and fascinating discussions.
* The [Understanding Event Sourcing](https://leanpub.com/eventmodeling-and-eventsourcing) book is an excellent introduction to implementing event-sourced systems with the help of Event Modeling.
* [Async API](https://www.asyncapi.com/en) is a specification and set of tools to help model and document event-driven systems in general. Think [Open API](https://www.openapis.org) but for events.

And the Ruby libraries I mentioned in the podcast:

* [RailsEventStore](https://railseventstore.org)
* [Sequent](https://sequent.io)
* [Eventide](https://eventide-project.org)
