---
draft: false
title: "Identity and behaviour"
date: 2025-07-10T22:59:00Z
authors: ["Ismael Celis"]
tags: ["architecture", "ddd"]
description: "In Object Oriented programming, identity and behaviour are often conflated. Some loud thinking on splitting them up."
images: ["/images/2025/identity-and-behaviour/order-flow.svg"]
---

One of the many assumptions that Object Orientation makes is that identity and behaviour always go together. There’s a cat named “Pepper”, and she can play, eat, and sleep (among other things). She jumps to your lap and curls up for a cuddle every time you call her name in a certain tone. In my understanding of Pepper, those behaviours are intrinsically linked to her Pepper-ness.

<!--more-->

```ruby
class Cat
  attr_reader :name
  
  def initialize(name)
    @name = name
  end
    
  def sleep
    # implement this
  end
    
  def eat(food)
    # implement this
  end
  
  def play
    # implement this
  end
end
```

At first glance, this mental model makes perfect sense, since it seems to map to “reality”. Cats *do* do all those things!

### A State of being

But do cats *always* do those things? Does Pepper eat when she’s asleep?

```ruby
class Cat
  attr_reader :name, :awake
  
  def initialize(name)
    @name = name
    @awake = true
  end
  
  def sleep
    @awake = false
  end
  
  def eat(food)
    raise "Can't eat, I'm sleeping!" unless @awake
    
    # implement this
  end
end
```

So, even if Pepper’s identity remains a constant (for our purposes), it turns out that at least some behaviours are in fact dependent on state. 

If we stick with the convention that a single class or module merges the ideas of identity and behaviour into a single concept, we need to guard our behaviours to only apply to the relevant state. Our code can quickly become defensive and finicky.

To manage this, in Ruby we often reach out to some State Machine abstraction.

```ruby
class Cat
  # etc
  state_machine :vigilance_state, initial: :awake do
    # Define allowed transitions
    event :sleep do
      transition awake: :asleep
    end
    event :wakeup do
      transition asleep: :awake
    end
    
    # define what behaviours are available in the different states
    state :asleep do
      def dream
        # implement this
      end
    end
    
    state :awake do
      def eat(food)
        # implement this
      end
    end
  end
end
```

This is certainly comprehensive, but it’s already quite indirect, and it should at least give us some pause: why do I need what’s essentially a different language to express this? Is this a technical or a “thinking” problem?

This approach seems to rest on the assumption that our code MUST map one-to-one directly with “real” objects. We see Pepper as “the same” cat regardless of whether she’s sleeping or not, therefore we should represent her in code as the same class containing all state and behaviours that we care about. Using a special DSL is a fair price to pay in order to keep that assumption going.

### Identity is about history

And “identity” is surely a useful concept! In real software systems we rely on identity to track how things behave over time. In an e-commerce system we want to know that `order-123` started as an empty cart, then a bag of cat litter and a can of cat food were added to it, then it was placed and became an Order, then it became two “shipments” because the cat litter is only available next week.

<img
  src="/images/2025/identity-and-behaviour/order-flow.svg"
  alt="Example cart-to-order-to-shipments flow" />

But in the flow above we pretty quickly recognise that, while the order’s identity may remain constant, it is NOT linked to constant behaviour. An open shopping cart cannot be *shipped*. A placed order cannot be placed again.

In OOP, we usually remove this tension by finding different names. A “cart” is not the same object as an “order”. And that’s true in many ways. But at the same time we do expect a continuity between them, we want to track how one progresses into the other, and we usually use some kind of token or ID to do it. From a business perspective we probably care more about `order-123` and the things that happen to it than whatever the classes are named at different stages! 

This essential disconnect between identity and behaviour can come to the surface when you start thinking about the domain in terms of [time instead of structure](https://ismaelcelis.com/posts/2025-04-give-it-time/).

So if “the business” cares about identity linked to history more than it cares about some static representation of some arbitrary subset of behaviour in code, it stands to reason to ask why are we tying identity to specific classes in the first place.

Pepper is the same cat to us “in the real world”, but that does not mandate that she must be modelled that way in code. [The real world doesn’t exist](https://udidahan.com/2012/03/05/dont-try-to-model-the-real-world-it-doesnt-exist/).

### Model behaviour separate from identity

If you think of identity (the thing you track), and behaviour (the things that can happen to that identity at different times or states) as separate concepts, you can re-model Pepper with classes that encapsulate the different behaviours without special pseudo-languages.

```ruby
class AwakeCat
  def initialize(name)
    @name = name
  end
  
  def sleep
    AsleepCat.new(@name)
  end
  
  def eat(food)
    # implement this
  end
end

class AsleepCat
  def initialize(name)
    @name = name
  end
  
  def dream
    # implement this
  end
  
  def awake
    AwakeCat.new(@name)
  end
end
```

This is obviously simplistic. Pepper’s behaviour could vary on multiple dimensions; for example it might refuse to eat if she’s already full, or a newborn kitten, etc. Here we could use composition, delegation, etc. But I think the more general point is: once we drop the assumption that identity and behaviour are the same thing, we open up a whole new set of understanding the mapping between reality and code.

### Why do we think this way

In FP this friction doesn’t really exist, because there state and behaviour are clearly delineated (by design). I think this is a biases that we Object Oriented have mainly because of the basic assumption that OO code works “by analogy to the real world”, which is also compounded by the common reliance on the ORM pattern, which once again blends together behaviour and data persistence (so we naturally think that a record in the database, the ORM class that represents it, and the behaviour it implements are all one and the same thing). 

However useful these tools are, it’s worth seeing through the huge assumptions they make about what’s possible when translating problems into code.
