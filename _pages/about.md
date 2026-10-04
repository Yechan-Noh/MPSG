---
layout: default
title: "Molecular Transport Simulation Group"
permalink: /
author_profile: false
body_class: home-page
---
<div class="mt-page mt-home">
<section class="home-intro" aria-labelledby="group-title">
  <div class="home-intro-copy">
    <h1 id="group-title">Molecular Transport<br>Simulation Group</h1>
    <p class="home-phrase">The chemistry of <span>molecular transport.</span></p>
  </div>
  <div class="home-animation"><canvas id="titleCanvas" aria-label="Animated MTSG particle logo">MTSG</canvas></div>
</section>
<section class="home-pi" aria-labelledby="pi-name">
  <img src="{{ '/assets/img/people/yechan-noh-2026.jpg' | relative_url }}" alt="Portrait of Yechan Noh" width="1114" height="1412">
  <div class="home-pi-details"><p class="home-pi-role">Principal Investigator</p><h2 id="pi-name">Yechan Noh, Ph.D.</h2><p>Provost’s Postdoctoral Fellow<br>University of Notre Dame</p></div>
  <p class="home-pi-bio">Before joining Notre Dame, Yechan was a postdoctoral researcher at the National Institute of Standards and Technology. He received his Ph.D. in Mechanical Engineering from the University of Illinois Urbana-Champaign.</p>
  <a class="home-profile-link" href="{{ '/people/' | relative_url }}">Full profile</a>
</section>
<section class="home-news" aria-labelledby="latest-news">
  <div class="home-news-heading"><h2 id="latest-news">Latest News</h2><a href="{{ '/news/' | relative_url }}">All news</a></div>
  <ul class="home-news-list">{% assign sorted_news = site.news | sort: 'date' | reverse %}{% for post in sorted_news limit:4 %}
    <li>{% if post.date_precision == 'month' %}<time datetime="{{ post.date | date: '%Y-%m' }}">{{ post.date | date: '%b %Y' }}</time>{% else %}<time datetime="{{ post.date | date: '%Y-%m-%d' }}">{{ post.date | date: '%b %d, %Y' }}</time>{% endif %}<a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>{% endfor %}
  </ul>
</section>
</div>
<script src="{{ '/assets/js/hero_graphic.js' | relative_url }}" defer></script>
