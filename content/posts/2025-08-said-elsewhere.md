---
draft: false
title: "Said elsewhere (August 2025)"
date: 2025-08-29T22:59:00Z
authors: ["Ismael Celis"]
tags: ["architecture","ddd","eventsourcing", "social media"]
description: "Things I've said on Bluesky in August 2025."
images: ["/images/2025/2025-08-said-elsewhere.png"]
---

Things I've said on [Bluesky](https://bsky.app/profile/ismaelcelis.com) in August 2025.
On Event Sourcing, Domain-Driven Design, Ruby, and software architecture.

<!--more-->

## [2025-08-01](https://bsky.app/profile/ismaelcelis.com/post/3lvdhvnqt6s2d)

I like Rails but I'm frustrated by how it shapes what Ruby devs consider "good code." Ruby mixes OOP and FP nicely, but a lot of idiomatic Ruby gets overlooked because Rails rarely uses it — we literally have function composition [built-in](https://ruby-doc.org/3.4.1/Proc.html#method-i-3E-3E).

## [2025-08-02](https://bsky.app/profile/ismaelcelis.com/post/3lvgmydsyr224)

I sketched a small demo idea combining Event Sourcing and LLMs to let an LLM dynamically change UI focus based on conversation context — a simple concept but with a few interesting possibilities.

## [2025-08-02](https://bsky.app/profile/ismaelcelis.com/post/3lvhd3fbbs227)

![](https://video.bsky.app/watch/did%3Aplc%3Aaf5ndzzxe7p5vbpmotcxmt6n/bafkreiejaahbcd6vblloofnwb2hctxpcttht6hfmp3t5re5pu7crgm7iyq/thumbnail.jpg)

I started a tiny Sinatra chat app that asks an LLM to create topics on the fly and categorises in a background thread, pushing updates with Datastar. Data started in PStore but I moved to SQLite. I linked the Datastar Ruby SDK I wrote: https://github.com/starfederation/datastar-ruby.

## [2025-08-03](https://bsky.app/profile/ismaelcelis.com/post/3lvj2rrazb227)

Watching silent 1950s home footage of my mum and family — tiny glimpses of another world. It made me think about how future descendants will watch our lives in far higher fidelity.

## [2025-08-04](https://bsky.app/profile/ismaelcelis.com/post/3lvlf4oubhs2q)

Short Claude anecdote: I asked how to do X and Y, got four options, then when I questioned each one Claude conceded flaws and moved to the remaining options — an amusing loop. Also spent an hour on the wrong Git branch that day.

## [2025-08-04](https://bsky.app/profile/ismaelcelis.com/post/3lvlonkcdrs2f)

![](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreihbunpdcxg6dpqtant6qhurt7jyqpbl3v5axpc75ipyxtcbmnz274@jpeg)

I spent a day improving the runtime's separation of infrastructure and app code: reactors are now simple interfaces the runtime fetches and acknowledges events for, and they can return types that tell the runtime what to do next. Commands/events are just messages in streams, and the runtime guarantees in-order processing per stream. The change should make reactors easier to test and let higher-level DSLs be built on top.

## [2025-08-05](https://bsky.app/profile/ismaelcelis.com/post/3lvngiqannc2q)

![](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreifx4khzsiexgyx3wglvaz6hexfpytggpfiodq42jiq6rjydnfkzzi@jpeg)

I showed a tiny logger reactor that catches up on existing events and then logs new ones, with the runtime guaranteeing per-stream ordering while allowing parallel stream processing. 
I also shared short demo videos and a one-liner Rack dashboard.

## [2025-08-05](https://bsky.app/profile/ismaelcelis.com/post/3lvo6bxeivk2a)

![](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreihu5bw2zvuyrravlnchu3xtouy4igyhrks7lr7iqv2ezvq6owkrja@jpeg)

I re-implemented Decide/Evolve/React actors on top of my messaging runtime and it works: the DSL compiles down to the two-method interface the runtime expects, and message correlation is automatic. The backend now uses a claim strategy to ensure per-stream ordering and concurrency while doing event handling outside transactions, which helps avoid connection pool contention.


## [2025-08-06](https://bsky.app/profile/ismaelcelis.com/post/3lvpwloqv4c2y)

![](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreictvidjadmubue4qinkinfxawxfifzasivdgr56adequpbq46orki@jpeg)

I argued that both sides of the "Service Objects in Ruby" debate miss the point — it's mostly Rails-isms vs non-Rails-isms. A procedure can be an object just as much as a domain entity; good code is about clear information flow, not dogma.

## [2025-08-07](https://bsky.app/profile/ismaelcelis.com/post/3lvsgnmsxus2y)

![](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreia3bk7houbndj3tcw2fwmyr5f3trdjazvppwyqlabxzgqr5qaqone@jpeg)

I made the runtime inject dependencies into consumers based on `handle(event, **args)` signatures.

## [2025-08-07](https://bsky.app/profile/ismaelcelis.com/post/3lvteggbbac2q)

I noted that a messaging-centric architecture tends to push you away from Object Orientation as an architectural style. You can still use OOP tactically, but messaging often becomes the dominant pattern at the architecture level.

## [2025-08-07](https://bsky.app/profile/ismaelcelis.com/post/3lvtrweyun22q)

![](https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreibywnv7rtmyp2gwgxby6t3x5dqbrbgatytbjj57e7p4dzmicyebsu@jpeg)

Shared a link to Ralf Westphal's [Killing the Entity!](https://ralfwestphal.substack.com/p/killing-the-entity) essay on Event Sourcing. I'm following the ES discourse — interesting ideas about doing ES the "epistemic" way.

## [2025-08-22](https://bsky.app/profile/ismaelcelis.com/post/3lwyb2ehtf22m)

I talked about how event sourcing makes it easier to track and assert software behaviour: the event schemas are the single artefact you need to understand end-to-end behaviour (logs, DB rows, API calls are all just side effects).

## [2025-08-23](https://bsky.app/profile/ismaelcelis.com/post/3lx3gzljy3k2v)

I had an hour to hack and Claude was surprisingly productive when tasks were well-scoped and I knew when to stop it. 
LLMs are good at summarisation and small test-driven tasks: have it write tests for an implementation or vice-versa to surface whether it really understood the intent.

## [2025-08-24](https://bsky.app/profile/ismaelcelis.com/post/3lx54yewz2c2w)

Most software doesn't "model" the real world. It TRACKS whatever set of metrics of it that are useful for the domain. Start  looking at it this way and you'll think differently about code, data and error cases.

## [2025-08-26](https://bsky.app/profile/ismaelcelis.com/post/3lxcabic7jc2h)

Familiarity and simplicity aren't the same.

## [2025-08-27](https://bsky.app/profile/ismaelcelis.com/post/3lxeu3timn22m)

![](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreiaaakhttc5bpjxfc7243tullepa72rg3bzhzkmnzcqk7nftjdkn7m@jpeg)

I sketched a small Rating struct in Ruby using my [Plumb](https://github.com/ismasan/plumb) gem with structural validation, then showed it as a pipeline with custom steps and function-composition syntax. The examples demonstrate simple, composable validation pipelines for multi-attribute rules.

## [2025-08-27](https://bsky.app/profile/ismaelcelis.com/post/3lxexrw3e4k2b)

There's only structural/input errors and true exceptions that should retry or crash; everything else is a valid domain scenario. This is easier to see once you accept eventual consistency — many "validations" are just domain outcomes, not runtime errors.

## [2025-08-28](https://bsky.app/profile/ismaelcelis.com/post/3lxhedhc55k22)

![](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreidjypsgurm25vj5qcrpzrg2fdkr3jqbsveeaqsmq53dsk5wkzddyi@jpeg)

I argued for organising code by verb-oriented capabilities — vertical slices — illustrated by some screenshots. 
I've used this approach in Ruby for years: it centres design on what the app _does_ rather than on data structures, which I find makes workflows and side-effects clearer than scattering behavior across CRUD endpoints.

## [2025-08-28](https://bsky.app/profile/ismaelcelis.com/post/3lxhkopgz422p)

![](https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreigyx3aockbe7mdzuhcmymlsb2lectq3f3io6zf6j6lovv6tkh3jbu@jpeg)

Good talk on durable execution and Ruby (Temporal).
I linked the talk: https://youtu.be/IMAABWxnbUM?t=462. What I'm building does the same durable-workflow stuff but exposes event sourcing as a modelling tool for your domain, not just resilient workflows — a whole programming model with plain Ruby + SQLite/PG.

## [2025-08-28](https://bsky.app/profile/ismaelcelis.com/post/3lxhvbd3y222p)

![](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreihnudgobndfnqh3wusdobubjdmgj26icgro32cexyai452dgg55mm@jpeg)

I showed a tiny example of a stateless API in my Ruby event-sourcing code that enforces a rule (three unsuccessful attempts fail a delivery) purely from past events. 
I also argued that stateless class methods don't mean "not OOP" — allocation can be a separate concern and `.new` is just a factory unless managing instance lifecycle matters to the caller.

## [2025-08-29](https://bsky.app/profile/ismaelcelis.com/post/3lxjwqg5yps23)

![](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:af5ndzzxe7p5vbpmotcxmt6n/bafkreif2gzofuopiej4cvof32nbt7nydkgj6hp4ve7s55tql6mbseunstu@jpeg)

I spent an hour adding durable-execution semantics (think [Temporal](https://temporal.io) or [Restate](https://restate.dev)) to my Ruby event-sourcing runtime. 

You declare an `execute` method and mark "durable" methods.
The system decomposes calls into started/failed/complete events, retries failures, and records the execution history. 

Work is done by worker processes (not just threads), so workflows resume after reboots and can be distributed across workers while preserving order.
