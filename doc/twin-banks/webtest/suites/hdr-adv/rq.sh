#!/bin/bash
# rq.sh PORT 'js body'
curl -s --max-time 300 -X POST --data-binary "$2" http://localhost:$1/
echo
