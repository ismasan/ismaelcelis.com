---
draft: false
title: "Wroclove.rb, Haggis Ruby 2026"
date: 2026-04-27T10:10:00Z
authors: ["Ismael Celis"]
tags: ["architecture","eventsourcing", "ruby", "talks"]
description: "Video of a presentation on Ruby and Event Sourcing I gave at Wroclove.rb 2026."
images: ["/images/2026/2026-04-wrocloverb.webp"]
---

<figure class="post-figure">
  <a href="https://www.youtube.com/watch?v=Q6owchf4WEo" title="Watch on YouTube">
    <img src="/images/2026/2026-04-wrocloverb.webp" alt="Wroclove.rb 2026 talk: Building reactive systems with Ruby and Event Sourcing" />
  </a>
  <figcaption>Watch the talk on <a href="https://www.youtube.com/watch?v=Q6owchf4WEo">YouTube</a></figcaption>
</figure>

I gave a talk at [Wroclove.rb](https://wrocloverb.com), in Poland, this April. It was originally going to be about the Actor Model in Event Sourcing, but I changed it to **Building reactive systems with Ruby and Event Sourcing**. 

<!--more-->

Basically I've been building a [little web framework](https://github.com/ismasan/sidereal) - as one does- designed for building command-oriented workflows where the UI just _reacts_ to state changes in the backend. This is still work in progress, and it started as patterns extracted from demo apps I've been building for showcasing [Sourced](https://github.com/ismasan/sourced), my (also WIP), Event Sourcing toolkit. 


The more general guiding principle being that I want my tools to let me [implement the domain in terms of its operations](/posts/2025-11-unfinished-business/), instead of what technical layer each operation lives in.

Right after Wroclove.rb, I did a workshop on Event Sourcing and Ruby at [Haggis Ruby](https://haggisruby.co.uk), in Glasgow, UK. In was my first workshop at a conference, and I tried to present a narrative from what Event Sourcing is, how you can use it in Ruby today, to what it _could be_, showing some of the work I've been doing to achieve a single, cohesive programming model with reactive, real-time UIs in the frontend and auditable, replayable and autonomous services in the backend. The workshop was not recorded, but if you're curious about what any of those words mean, watch the video above!

A huge thank you to the organisers at both conferences. I had a great time and brilliant conversations with like-minded people.

PS:
These two talks came on the back of a two-week holiday visiting family in Chile. It made for a pretty intense April overall.

<figure class="post-figure">
  <a href="https://www.google.com/maps/place/Playa+Laguna+Huinfiuca/@-39.5801838,-71.5421294,14.76z/data=!4m14!1m7!3m6!1s0x9613dcb893f1aed5:0xc688bdb6da386418!2zTGFuw61u!8m2!3d-39.6372198!4d-71.5023509!16s%2Fm%2F025s9nh!3m5!1s0x9613c250d988c81f:0x1611d74d3e33df49!8m2!3d-39.5798877!4d-71.5341688!16s%2Fg%2F11fxdzc7nv?entry=ttu&g_ep=EgoyMDI2MDQyMi4wIKXMDSoASAFQAw%3D%3D">
    <img src="/images/2026/lanin-trek.webp" alt="A glacial lake surrounded by Araucarias (monkey puzzle trees), in the mountains of southern Chile." />
  </a>
  <figcaption>Laguna Huenfuica, a glacial lake surrounded by Araucarias (monkey puzzle trees), in the mountains of southern Chile, with the Lanin volcano in the background. We got there after a two hour trek in what's always been one of my favourite areas in the world.</figcaption>
</figure>
