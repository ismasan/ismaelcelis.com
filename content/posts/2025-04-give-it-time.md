---
draft: true
title: "Give it time"
date: 2025-04-04T11:55:54Z
authors: ["Ismael Celis"]
tags: ["architecture","ddd"]
description: "Modeling your domain as timelines instead of object graphs"
images: []
---

Our experience of reality is based on the passage of time. Things begin and end, events happen one after the other. The world _changes_. 
And yet we model software as static object graphs frozen in time.

<!--more-->

This sort of makes sense. While I'm used to going through my day as events in time (wake up, have breakfast, shower, _really_ wake up, etc), the act of _understanding_ feels like building a graph. When I start a new job, I want to grasp the _current_ structure of the system. What department or team am I part of, how does this team interact with other teams in the organization, etc. The history of how the current structure came to be is not immediatly relevant to me. 

More to the point: when I plan for a new project, my mind tends to gradually form a static picture of the system. I try to understand how the different components interact with each other, and how they relate to the business domain. I think in hierarchies.

![Object graph](/images/2025/timelines/object-graph.svg)

Then I use frameworks and programming paradigms that lean on this intuition. I model conceptual hierarchies as _associations_, and I think about domain entities as being _parents_ or _children_ of each other. I use statements like "an account _has many_ customers", "a line item _belongs to_ an order". 

These mental images exist in a kind of platonic universe, outside of time. 

But this "timeless" view of the world is short-lived. It really only kicks in during the process of understanding a system from scratch. Past that stage, I have to deal with the fact that the world _does_ change. The domain is not static, and neither is my understanding of it. From then on, I have to think about how the system _evolves_ over time. We deal with _refactoring_, _migrating_, and accommodating changing requirements.  

For most of a project's life cycle, time _does_ play a big role.

And with time as a dimension, and change as a driver, graphs can go from asset to liability.

### Depth and coupling

Graphs grow deeper as the domain grows more complex. Perhaps product variants have colours associated to them. Perhaps they have a price. Perhaps orders can have discounts. Then line items in an order can also have their own discounts.

![Deeper graph](/images/2025/timelines/deeper-graph.svg)

Different parts of the model become progressively more tangled together. As the domain becomes more complex, so does the mental model. Graph depth is unbounded.

### Where's the door?

Graph-based models are effective at describing structure, but can be lacking at describing _behaviour_. What capabilities does the model expose? What _workflows_ does it enable and, more importantly, what are the _entry points_ into those workflows?

This is especially true of ORM-based models, where data and capabilities are melded into the same relational graph.
ORMs offer amazing flexibility, but they can make it hard to describe the model's intended behaviour.

For example, you can create an order line item via the order record:

```ruby
line_item = order.line_items.create(variant: variant, ...)
```

... Or via the line item record factory:

```ruby
line_item = LineItem.create(order: order, variant: variant, ...)
```

Because of this malleability, domain invariants become hard to enforce and reason about.
For example, if a business rule says that an order can only have up to 5 line items: that validation probably lives in the context of an _order_. But since the object graph allows us to create line items directly, we're forced to resort to callbacks and other indirect methods to enforce invariants across whole sections of the graph.

```ruby
class Order
  has_many :line_items
  validates :max_five_line_items
end

class LineItem
  belongs_to :order
  before_save :validate_order
end
```

Moreover: business rules are often contextual. The order can only have 5 line items _if_ the order is in a certain state, or if the customer is a certain type. Rules are not necessarily properties of the graph structure itself, but relative to behaviour, data and time.

### Implicit command layer

One way to identify behaviour and capabilities in the model is by looking at the points where users interact with it. In CRUD web systems this is usually HTTP handlers or controllers.

```ruby
# POST /orders/:id/line_items
def create
  order = Order.find(params[:id])
  order.line_items.create(line_item_params)
end
```
These handlers define the entry points into the system. They constitute the system's _command layer_, albeit somewhat informally, and tied to a specific execution context - handling HTTP requests.

If we then need to run some capabilities in the background, or as CLI tasks or scheduled jobs, we're required to model and implement those entry points in different ways, tied to their distinct execution contexts.

```ruby
# A background job
class OrderArchivalJob
  def perform(order_id)
    order = Order.find(order_id)
    order.archive
  end
end
```

```
# A CLI task
bin/rake orders:archive
```
These are all _commands_ by another name. We just refer to them by their execution contexts instead of their roles in the system. 

### Dee-dee-dee

It's this kind of ambiguity that Domain Driven Design set out to solve. And its focus on language can indeed provide a lot of clarity, keep coupling in check, and illuminate the entry points into the system.

In particular, DDD's [Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html) acts as a gatekeeper into the model. Aggregates enforce business rules and guarantee data consistency for entire chunks of the model.

```ruby
class Order
  def add_line_item(variant_id:, ...)
    # validate business rules rules
    raise "order can't have more than 5 line items" if line_items.count >= 5
    line_items.create(variant_id: variant_id, ...)
  end

  def update_quantity(line_item_id, quantity)
    # etc
  end

  def remove_line_item(line_item_id)
    # etc
  end
end
```
```ruby
# The Order is the Aggregate Root
# for all order-related capabilities
# All interactions with an order or its sub-components 
# are defined as methods in the order
line_item = order.add_line_item(variant_id: 10, ...)
```

DDD's Aggregate and [bounded contexts](https://martinfowler.com/bliki/BoundedContext.html) can also help keep different parts of the model decoupled from each other by defining strict boundaries around them. In our example above, we can decide that variant prices belong to a _pricing_ context, and that orders belong to a _sales_ context. With this constraint in mind we then define the contract between the two contexts.

### Standalone command objects

Yet another way to bring a system's behaviour to the fore -and abstract it away from execution context- is to have explicit command objects. These are sometimes referred to as "service objects" (a mis-identification that usually belies a misunderstanding of the role they play).

```ruby
AddLineItem.run(order_id: 123, variant_id: 456, ...)
```

This pattern can definitely be misused, but it can also give clear indication of a system's capabilities as a distinct and uniform abstraction.

<style>
  .file-tree {
    font-family: monospace;
    list-style-type: none;
    background: var(--hljs-bg);
    padding: 1rem var(--gap);
    color: #f8f8f2;
    margin: 0 calc(var(--gap) * -1) 4rem;
  }
  
  .file-tree code {
    line-height: 1;
  }

  .folder {
    color: #66d9ef;
  }
  
  .file {
    color: #e6db74;
  }
  
  .file-tree ul {
    list-style-type: none;
  }

  .file-tree li {
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }
</style>

<ul class="file-tree">
  <li>
    <code class="folder">commands/</code>
    <ul>
      <li>
        <code class="folder">orders/</code>
        <ul>
          <li><code class="file">create.rb</code></li>
          <li><code class="file">add_line_item.rb</code></li>
          <li><code class="file">remove_line_item.rb</code></li>
          <li><code class="file">archive.rb</code></li>
          <li><code class="file">cancel.rb</code></li>
          <li><code class="file">update_quantity.rb</code></li>
          <li><code class="file">place.rb</code></li>
        </ul>
      </li>
    </ul>
  </li>
</ul>

### The arrow of time

But in trying to surface a system's behaviour and entry points, in all cases we hit on the central concept of a _command_.
Commands initiate action, and may lead to state changes and side effects. Commands are causes to your domain's effects. At a high level, we can describe entire sets of behaviours in those terms.

![Cause and effect](/images/2025/timelines/cause-and-effect.svg)

There's an explicit sense of direction here. There's a _before_ and an _after_. There's _time_. 
Behaviour implies time. Behaviour can be modeled and tracked as a sequence of effects, and effects are _events_ that happen over time.

Your domain can be modeled as a timeline instead of a graph.

### Time is composable

* Command => effect slices can be composed into workflows.

### Time surfaces concurrency

### When, not where

* Workflows can be defined independent of execution context.

### The deep state

* The deep state. State is derived from events.
* Graphs are deep, timelines are shallow

