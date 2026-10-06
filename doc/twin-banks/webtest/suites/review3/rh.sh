#!/bin/bash
# rh.sh '<json>'  -> POST to the driver
curl -s -X POST -d "$1" http://localhost:${PORT:-9333}/
