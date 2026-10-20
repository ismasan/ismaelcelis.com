---
draft: false
title: "Welcome to the machine"
date: 2026-10-20T10:10:00Z
authors: ["Ismael Celis"]
tags: ["architecture", "ai"]
summary: "This blog post is only incidentally about AI."
images: ["/images/2026/welcome-to-the-machine/how-to-coffee.png"]
---

This blog post is only incidentally about AI.

I wasn’t happy with the state of programming even before the robot apocalypse. It wasn’t all the typing, though I’m still a terrible typist, 25 years in. It was just that sense of things continually escaping the limits of my understanding.

I have the attention span of an anaesthetised goldfish, and have always struggled with keeping too much detail in my head at once. I’m always in awe at how some colleagues glide through large codebases seemingly knowing where everything is and what everything does. I’m not like that, so I always try to come up with abstractions that let me grasp the gist of the problem while ignoring the details.

That’s what every abstraction is, of course! But I think I was always after a particular kind of abstraction, and I’ve only been able to articulate it in the last few years: I need the code to tell me stories. I want to follow a thread from start to finish. How do you draft and send an invoice in this app? [How do I order a cup of coffee?](https://ismaelcelis.com/posts/2025-09-baltic-ruby-event-sourcing-talk/)

So I’ve been banging on about the benefits of what I’ll call [causal modelling](https://ismaelcelis.com/posts/2025-04-give-it-time/) to anyone who’ll listen. It’s both a simple idea and surprisingly difficult to get across, but here’s the TL;DR again:

Object models are not enough to explain a domain. They are great at describing the structure of a system, but have very little to say about the behaviour of the system. And we build software to _do_ stuff. Most domains are about the doing, the verbs, the behaviour. And behaviour is described through causality. `A` leads to `B`, `B` leads to `C` or `D`.

Structural models (your typical CRUD app modelled around database schemas and object relationships) pretend to describe a kind of platonic domain of static entities floating in the ether, and its up to us mortals to work out how to actually use them. Behaviour is assumed to emerge from an object model’s possible interactions.

<figure class="post-figure">
  <img src="/images/2026/welcome-to-the-machine/how-to-coffee.png" alt="Where's the behaviour modeled?" />
  <figcaption>The object model on its own doesn't tell me how to order a cup of coffee.</figcaption>
</figure>

Except that this is almost never how systems are built, in practice. Your client asks for a new feature -say: customers need to be able to select add-ons for their coffee- and we very specifically introduce the entities and relationships needed for the object model to support that one new behaviour. Then we model the customer workflow on top of the new objects by a mishmash of application-level artefacts (controllers, routes, jobs, views, etc) glued together by circumstance. 

But guess what: your client has a very clear idea of how people should buy coffee in their shop. They couldn’t care less about your database schema.

The problem: the gap between a perfectly reasonable object model, and the specific workflows we’re expected to build on top of them is left wide open to inference (of the biological or machine kind). Structural modelling makes things look simple only because it has little to say about what’s actually important in a domain.

<figure class="post-figure">
  <img src="/images/2026/welcome-to-the-machine/inference-gap.png" alt="Not all abstractions are equal" />
  <figcaption>Abstractions are more important than ever, but not all abstractions describe behaviour effectively.</figcaption>
</figure>

So, I struggle with codebases that don’t describe behaviour cohesively, and I suspect that robot brains do too. Or rather, they’ll be happy to infer what you mean by “customers should be able to buy add-ons for their coffee”, and get it wrong. For the same reason you’ll get it wrong when the behaviour is not explicitly specced out. These inferred decisions quickly pile up and it gets harder and harder to grasp how the app even works. Hello [cognitive surrender](https://addyosmani.com/blog/cognitive-surrender/).

And this is not even a new problem! The hunt for deterministic, declarative behaviour is built into the history of computing (hint: Turing tapes). [Finite State Machines](https://en.wikipedia.org/wiki/Finite-state_machine), [Petri nets](https://en.wikipedia.org/wiki/Petri_net), [Behaviour Trees](https://en.wikipedia.org/wiki/Behavior_tree_(artificial_intelligence,_robotics_and_control)), [Dataflow](https://en.wikipedia.org/wiki/Dataflow), [State Charts](https://statecharts.dev), [Event Modeling](https://eventmodeling.org). As program behaviour becomes more complex, there’s always been a need to formalise how workflows are described and put together. It’s mostly us web developers, and mostly us in CRUD-oriented subcultures, that have scoffed at these attempts because they’re seen as too academic, complex, just not needed for the scale of our projects.

<figure class="post-figure">
  <img src="/images/2026/welcome-to-the-machine/ruby-statecharts.png" alt="Declarative statecharts in Ruby" />
  <figcaption>Declarative statecharts, in Ruby, and the diagram generated from the code. If program causality can be diagrammed mechanically, it can be understood unambiguously.</figcaption>
</figure>

But here’s the thing. A 10-person team is now a 10-person plus robots team, and produces 10X more code per day. As an individual developer, this is not dissimilar to joining a 100-person team and trying to keep up. The robots may have become sophisticated enough to handle it, but we still need to understand what they’re doing, and they need to understand what we want.

It’s very difficult to know what you want to build next if you don’t understand what’s already been built.

So, programming isn’t dead, but the programming models some of us are used to definitely are. CRUD frameworks describe too little of the problem, and leave too much of it up to guesswork. We need mental models that can describe causality unambiguously, that can be verified causally (A did indeed lead to B), so that we can tell the stories we want and have the robots flesh them out, and recite them back to us.

We’re very lucky that this problem has existed for decades and we have a huge set of mental models to choose from!

<figure class="post-figure">
  <video class="post-video" controls>
    <source src="https://f001.backblazeb2.com/file/ismaelcelis/2026/holiday-booking.webm" type="video/webm" />
  </video>
  <figcaption>A web UI for the Ruby statechart above. All behaviours, validations and UI states are derived from the statechart definition. The program structure is statically-inspectable, and runtime-observable.</figcaption>
</figure>

So, this blog post is not about AI, or the end of coding. It's about reducing the cognitive gap between software design and expected outcome. The robots just make the gap really hard to ignore.
