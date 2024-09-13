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

The Decide, Evolve, React pattern provides a unified mechanism for expressing, handling and reacting to state changes in a system.

![Decide, Evolve, React diagram](/images/2024/decide-evolve-react-pattern/diagram1.png)

It optionally provides a 100% accurate audit trail of changes, by tying together events to the state changes they cause.

It's a generalisation of the [Event Sourcing pattern](/posts/event-sourcing-ruby-examples/), but it doesn't require a log of events or a replay mechanism, and can be readily leveraged by traditional CRUD systems.

### 1. Decide

The _decide_ step takes and validates input in the form of a [command](/posts/event-sourcing-ruby-command-layer/), fetches any necessary data to fulfil the command, and decides how to update the state based on all that. The state changes are expressed as a set of _events_.

![Decide](/images/2024/decide-evolve-react-pattern/decide.png)

Let's say we're building a shopping cart system. We have a `cart` object that we can add and remove items from.

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

Now, given a new or existing cart (ex. fetched from the database, or a new instance)...

```ruby
cart = DB.find_cart(cart_id) || Cart.new(SecureRandom.uuid)
```
... And a new `AddItemToCart` command sent by the client...

```ruby
command = AddItemToCart.new(cart_id: cart.id, product_id: 3, quantity: 1)
```

We feed the cart and the command to the _decider_ function (or class, module, etc). Its job is to evaluate the current state of the cart, the command, and decide whether an item can be added to the cart.

```ruby
# @param cart [Cart]
# @param command [Command]
# @return [Array<Event>]
def decide(cart, command)
  case command
    when AddItemToCart
      # 1. Is there an actual product with this ID?
      product = DB.find_product(command.product_id)
      raise "Product not found" unless product

      # 2. Is the product in stock?
      raise "Out of stock" unless product.inventory >= command.quantity

      # 3. Return events to add the item to the cart
      [
        ItemAddedToCart.new(
          product_id: product.id, 
          name: product.name, 
          price: product.price, 
          quantity: command.quantity
        )
      ]
    end
  end
end
```
