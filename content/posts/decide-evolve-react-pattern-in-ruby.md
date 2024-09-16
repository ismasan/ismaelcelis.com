+++
draft = false
date = 2024-09-12T11:00:00Z
title = "The Decide, Evolve, React pattern in Ruby"
description = "The Decide, Evolve, React pattern in Ruby, explained step by step"
images = ["/images/2024/decide-evolve-react-pattern/diagram1.png"]
slug = "decide-evolve-react-pattern-in-ruby"
authors = ["Ismael Celis"]
tags = ["ruby", "design patterns", "eventsourcing"]
categories = []
externalLink = ""
series = []
+++

<style>
.bullet-title { 
  display: inline-block; 
  background-color: black;
  color: white; 
  padding: 0 0.5em; 
  border-radius: 0.5em; 
}
</style>

The Decide, Evolve, React pattern provides a unified mechanism for expressing, handling and reacting to state changes in a system.

![Decide, Evolve, React diagram](/images/2024/decide-evolve-react-pattern/diagram1.png)

It optionally provides a lossless audit trail of changes, and the seeds of a pub/sub sub-system, by tying together events to the state changes they cause.

It's a generalisation of the [Event Sourcing pattern](/posts/event-sourcing-ruby-examples/), but it doesn't require a log of events or a replay mechanism, and can be readily leveraged by traditional CRUD systems.

### Terminology

<ul>
  <li><strong class="bullet-title">State</strong> The current state of an entity in the system. A shopping cart, a user profile, a bank account.</li>
  <li><strong class="bullet-title">Command</strong> A request or <em>intent</em> to change the state of an entity. Add an item to the cart, update the user's email, transfer money.</li>
  <li><strong class="bullet-title">Event</strong> A record of a change in state. Item added to cart, email updated, money transferred.</li>
</ul>

### 1. Decide

The _decide_ step takes and validates input in the form of a [command](/posts/event-sourcing-ruby-command-layer/), fetches any necessary data to fulfil the command, and decides how to update the state based on all that. The state changes are expressed as a set of _events_.

![Decide](/images/2024/decide-evolve-react-pattern/decide.png)

Let's say we're building a shopping cart system. We have a `cart` object that we can add and remove items from. This is our _state_.

```ruby
cart = Cart.new
cart.add_item(id: 1, name: 'Apples', price: 100, quantity: 2)
cart.add_item(id: 2, name: 'Oranges', price: 200, quantity: 1)
cart.total # => 400
```

We don't update the cart directly in our app. Instead, we define a _command_ that describes the change we want to make to the cart.

```ruby
AddItemToCart = Data.define(:cart_id, :product_id, :quantity)
```

Now, given a new command sent by the client...

```ruby
command = AddItemToCart.new(cart_id: 'cart-123', product_id: 3, quantity: 1)
```

... And a cart instance (fetched from the database, or a new instance)
```ruby
cart = DB.find_cart(command.cart_id) || Cart.new(cart.id)
```

We feed the cart and the command to the _decider_ function (or class, module, etc). Its job is to evaluate the current state of the cart, the command, and decide whether an item can be added to the cart.

```ruby
# @param cart [Cart]
# @param command [Command]
# @return [Array<Event>]
def decide(cart, command)
  case command
    when AddItemToCart
      decide_add_to_cart(cart, command)
    else
      raise ArgumentError, "Unknown command #{command.class}"
  end
end

def decide_add_to_cart(cart, command)
  # 1. Is there an actual product with this ID?
  product = DB.find_product(command.product_id)
  raise "Product not found" unless product

  # 2. Is the product in stock?
  raise "Out of stock" unless product.inventory >= command.quantity

  # 3. Return events to add the item to the cart
  [
    ItemAddedToCart.new(
      item_id: product.id, 
      name: product.name, 
      price: product.price, 
      quantity: command.quantity
    )
  ]
end
```

So that's it: given a command, we expect one or more events. We can replicate the pattern to handle more commands.

```ruby
case command
  when AddItemToCart
  # ...
  when UpdateItemQuantity
  # ...
  when RemoveItemFromCart
  # ...
end
```

### 2. Evolve

![Evolve](/images/2024/decide-evolve-react-pattern/evolve.png)

The event classes are also just structs.

```ruby
ItemAddedToCart = Data.define(:item_id, :name, :price, :quantity)
ItemRemovedToCart = Data.define(:item_id, :name, :price, :quantity)
```

Once the _decide_ function evaluates a command and returns events, we iterate the events and "evolve" the state of the cart.

```ruby
# @param cart [Cart]
# @param events [Array<Event>]
# @return [Cart]
def evolve(cart, events)
  events.each do |event|
    case event
    when ItemAddedToCart
      cart.add_item(
        id: event.product_id, 
        name: event.name, 
        price: event.price, 
        quantity: event.quantity
      )
    when ItemRemovedFromCart
      cart.remove_item(event.item_id)
    end
  end

  cart
end
```

That's _evolve_ done. Given a piece of state and one or more events, return an updated state.

### 3. React

_React_ takes the new state and generated events, and triggers side-effects. This could be sending an email, updating a database, or publishing a message to a queue.

![React](/images/2024/decide-evolve-react-pattern/react.png)

In most cases this is where you'll actually persist the results of the steps above. Ie. updating the new version of the shopping cart back to the database, and saving the events if you want to keep them around for auditing or replaying.

```ruby
def react(cart, events)
  DB.transaction do
    DB.save_cart(cart)
    DB.save_events(events)
    Emails.send_cart_updated(cart)
    Webhooks.notify_cart_updated(cart, events)
  end
end
```

Implementation will vary, but I'm wrapping the above in a transaction to ensure that all the steps succeed or fail together. This is important to keep the system in a consistent state. Events are the source of truth in this system, so you want to make sure they are persisted along with the state.

<p><blockquote>
  Note that saving state and events in an ACID transaction is only possible if both are persisted to the same database.
  In some cases you'll be using an event store that is separate from your main database, and you'll have to ensure consistency between the two systems by other means, one being the <a href="https://microservices.io/patterns/data/transactional-outbox.html#solution">Outbox pattern</a>.
</blockquote></p>


Regardless of the implementation details, this locking of events and decision logic together is what gives you a lossless audit trail of changes in your system.

<ul class="execution-trace">
    <li class="running">1. <code>2024-09-16 11:28:46 cart-123</code> 2x Apples added to cart</li>
    <li class="running">2. <code>2024-09-16 11:28:59 cart-123</code> 1x Apples removed from cart</li>
    <li class="running">3. <code>2024-09-16 11:29:10 cart-123</code> 3x Oranges added to cart</li>
</ul>


In many cases, you'll want your _react_ step to **initiate new command flows**. For example by scheduling a new command that is then picked up by a background worker and fed back in the _decide_ step.

```ruby
def react(cart, events)
  DB.transaction do
    # DB.save_cart(cart)
    # DB.save_events(events)
    # Emails.send_cart_updated(cart)
    # Webhooks.notify_cart_updated(cart, events)
    CommandJob.perform_later(UpdateInventory.new(cart_id: cart.id))
  end
end
```
### Putting it all together

There's many ways to put this all together, but this is one option given the examples above.

```ruby
class CartDomain
  def run(command)
    # Fetch or initiate the shopping cart
    cart = DB.load_cart(command.cart_id) || ShoppingCart.new(command.cart_id)
    # Run the decide function and get the events
    events = decide(cart, command)
    # Run the evolve function and get the updated cart
    evolve(cart, events)
    # Run the react function to persist the changes
    # and trigger side effects
    DB.transaction do
      react(cart, events)
    end
  end

  # Decide, Evolve, React functions and any other helpers down here
end
```
<p><blockquote>
  In these examples I'm assuming the shopping cart is a mutable object. For example <code>evolve</code> is assumed to update the cart instead of returning a new copy.
  In functional implementations all three steps may be <em>pure</em> functions that return new versions of the cart and events, without modifying the originals.
</blockquote></p>

### Making it nicer

In real code you might want to abstract some of the implementation into more reusable helpers. For example if you plan to use this pattern for several entities in your system. You will also very probably want to facilitate validating command attributes to make sure they're valid before handling. Below is an example of the type of internal APIs I've come up with in the past.

```ruby
module Commands
  # Define commands with structural validation of attributes.
  # For example using AcitveModel::Validations, Dry-Types, etc.
  class AddItemToCart < Command
    attribute :cart_id, String
    attribute :product_id, Integer
    attribute :quantity, Integer

    validates :cart_id, :product_id, :quantity, presence: true
  end

  # etc.
end

# A class to encapsulate the full lifecycle of a shopping cart
class CartDomain < StateHandler
  entity ShoppingCart

  # Command handlers. A.K.A. "deciders"
  decide Commands::AddItemToCart do |cart, command|
    # validate command, fetchh product, etc
    # Return new events
    [ItemAddedToCart.new(product_id: product.id, ...)]
  end

  decide Commands::RemoveItemFromCart do |cart, command|
    # ...
  end

  # Event handlers. A.K.A. "evolvers"
  evolve Events::ItemAddedToCart do |cart, event|
    cart.add_item(...)
  end

  evolve Events::ItemRemovedFromCart do |cart, event|
    cart.remove_item(...)
  end

  # Side effect handlers. A.K.A. "reactors"
  # Make sure to persist events and cart
  react :any, PersistEventsAndEntity

  # Here we can react to specific events
  react Events::OrderPlaced do |cart, event|
    Emails.send_order_confirmation(cart)
    # Here we can send a command to manage a separate domain or entity
    CommandJob.perform_later(Commands::UpdateInventory.new(cart_id: cart.id))
  end
end
```

And then you use this whereever you handle user input in your app (controllers, background workers, CLIs, etc).

```ruby
# POST /carts/:id/items
command = Commands::AddItemToCart.new(params[:command])
# Do something if the command is invalid
# respond_with_error(command.errors) unless command.valid?

CartDomain.run(command)
```

### State machines

You'll already have noticed that this basically describes a state machine. The fact is that _any_ change to state in any app is a state machine, whether you think of it that way or not. This pattern makes it explicit and consistent for all state mutations in your app.

Note that you can still model specific "business states" on top of this. The following example adds an `order_status` field to shopping carts, and events to track the transition from an open shopping cart to a placed order.

```ruby 
decide Commands::PlaceOrder do |cart, command|
  raise "Cart already placed" if cart.order_status == 'placed'
  [OrderPlaced.new(cart_id: cart.id)]
end

evolve Events::OrderPlaced do |cart, event|
  cart.order_status = 'placed'
end

react Events::OrderPlaced do |cart, event|
  Emails.send_order_confirmation(cart)
end
```

You can go back to previous event handlers in your domain and encode business rules, such as forbidding mutations of closed carts.

```ruby
decide Commands::AddItemToCart do |cart, command|
  raise "Cart is closed" if cart.order_status == 'placed'
  # ...
end
```
### Testing

By segregating the handling of input (commands), mutations (events) and side-effects (reactions) you can test each part in isolation.

```ruby
domain = CartDomain.new(id: 'cart-123')
event = Events::ItemAddedToCart.new(cart_id: cart.id, product_id: 1, ...)
cart = ShoppingCart.new
domain.evolve(cart, event)
expect(cart.items.size).to eq(1)
```

### Documentation

An interesting outcome of this pattern is that it also "flattens" your domain's internal API into a list of actions (commands), a list of known state changes (events), and a list of side effects. Together they form a comprehensive "protocol" of what your app can do. For example you could list your commands and generate documentation for your API.

It can also make the code itself be more cohesive and self-documenting.

### Drawbacks

Nothing is free, unfortunately. This pattern is more complex than just updating state directly, and it can be overkill for simple CRUD systems. It also requires a bit of boilerplate to set up, and can be hard to understand for developers unfamiliar with it. It may also conflict with data-management patterns that want to control side effects in their own way. For example ORM callbacks. It'll take some discipline to avoid using those and registering side effects as explicit reactions instead.

### EventSourced vs StateStored systems

As mentioned at the start, this pattern is a super-set of Event Sourcing. The version illustrated here uses a "state-stored" implementation where the current state of entities is fetched from a regular database, and later persisted back to it. This plays well with traditional CRUD systems that just want to consolidate state management and auditing.

A slightly different "event-sourced" implementation first replays past events to reconstruct the current state of entities, and then applies new events to update it. 

```ruby
# Event-sourced version
# 1. fetch past events and evolve them into an initial state
cart = ShoppingCart.new(id: command.cart_id)
historical_events = DB.load_events_for(cart.id)
evolve(cart, historical_events) # replay past events to get current state

# 2. decide, evolve, react
new_events = decide(cart, command)
evolve(cart, new_events)
react(cart, new_events)
```

### Sources

* [Functional Event Sourcing Decider](https://thinkbeforecoding.com/post/2021/12/17/functional-event-sourcing-decider)
* [f { model }](https://fraktalio.com/fmodel/)
