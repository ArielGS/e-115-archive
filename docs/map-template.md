---
# Copy this file to src/content/maps/en/<era>/<map>.md and to src/content/maps/es/<era>/<map>.md,
# then write the Spanish version (neutral Spanish: tú / ustedes).
# Spoiler and dossier ids come from the Spanish titles; in the English file add {id="<spanish-id>"} to each one.
# Every image must be listed in scripts/images.manifest.json (npm run images).
#
# Required ## sections (the content tests check them), English → Spanish:
#   Before you start               → Antes de empezar
#   Where you are and who you are  → Dónde estás y quién eres
#   The objective                  → El objetivo
#   Enemies and bosses             → Enemigos y jefes
# The Spanish narrator intro starts with "Transmisión del Archivo ciento quince."
title: "Map name"
era: bo3 # bo1 | bo2 | bo3
order: 4 # position within its game
status: guide # guide = full guide | stub = pending entry
released: "2016-04-19"
setting: "Place, country (year)"
tagline: "A catchy, spoiler-free one-liner."
thumb: /images/maps/bo3/my-map/thumb.webp
hero: /images/maps/bo3/my-map/hero.webp
accent: "#8bd450" # main colour of the map
ambient: default # noir | factory | castle | default (narrator background sound)
difficulty: 3 # 1 to 5
facts:
  - label: Characters
    value: "…"
  - label: First objective
    value: "…"
intro: "Archive 115 transmission. File: … (what the narrator says when it starts)"
---

## Before you start

What kind of map this is and what to expect, without spoilers.

:::narration
A transition line only people using the narrator hear.
:::

## Where you are and who you are

Context the game shows in the first few minutes.

:::spoiler[What you should not know yet]{level="lore"}
Story twists.
:::

## The objective

:::steps
1. First objective.
2. Second objective.
:::

## Your first rounds

## What to build

::::grid
:::card[Part]{img="/images/maps/bo3/my-map/part.webp"}
What it is for and where it is built.
:::
::::

## Enemies and bosses

:::dossier[Boss name]{kind="boss" threat="4" teaser="A visible, spoiler-free hint." img="/images/maps/bo3/my-map/boss.webp"}
How to fight it, and its lore.
:::

## Secrets and the full story

:::spoiler[The secret quest]{level="ee"}
Summary of the main quest steps.
:::

## Tips for playing as a duo

- Tip.
