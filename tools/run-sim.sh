#!/bin/bash
# Balance lab: play the real game headlessly under Node.
#   ./tools/run-sim.sh                     # smoke regression (feature assertions)
#   STRAT=radiance REPS=3 ./tools/run-sim.sh bot     # balance sim
#   STRAT=blight_paced ./tools/run-sim.sh bot        # the rationing reaper
#   STRAT=radiance ENDLESS=1 ./tools/run-sim.sh bot  # endless-depth probe
# Strategies: radiance | blight | blight_paced | hybrid
cd "$(dirname "$0")/.."
sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > /tmp/af_game.js
DRIVER=tools/smoke-driver.js
[ "$1" = "bot" ] && DRIVER=tools/balance-bot.js
cat tools/dom-stubs.js /tmp/af_game.js "$DRIVER" > /tmp/af_sim.js
node /tmp/af_sim.js
