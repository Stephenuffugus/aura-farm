#!/bin/bash
# Balance lab: play the real game headlessly under Node.
#   ./tools/run-sim.sh                     # smoke regression (feature assertions)
#   STRAT=radiance REPS=3 ./tools/run-sim.sh bot     # balance sim
#   STRAT=blight_paced ./tools/run-sim.sh bot        # the rationing reaper
#   STRAT=radiance ENDLESS=1 ./tools/run-sim.sh bot  # endless-depth probe
# Strategies: radiance | blight | blight_paced | hybrid
cd "$(dirname "$0")/.."
# Extract the MAIN game block: the last block opened by a bare <script> line.
# (A plain sed range broke the day the page gained a one-line SDK <script>.)
awk '/^<script>$/{f=1;buf="";next} /^<\/script>$/{if(f)last=buf;f=0;next} f{buf=buf $0 "\n"} END{printf "%s",last}' index.html > /tmp/af_game.js
DRIVER=tools/smoke-driver.js
[ "$1" = "bot" ] && DRIVER=tools/balance-bot.js
cat tools/dom-stubs.js /tmp/af_game.js "$DRIVER" > /tmp/af_sim.js
node /tmp/af_sim.js
