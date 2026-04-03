#!/bin/bash
cd /home/z/my-project
while true; do
    # Verificar si el servidor está respondiendo
    if ! curl -s -o /dev/null -w "" http://localhost:3000/ 2>/dev/null; then
        # Matar procesos antiguos
        pkill -f "next dev" 2>/dev/null
        pkill -f "next-server" 2>/dev/null
        sleep 2
        # Iniciar servidor
        bun x next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
        sleep 10
    fi
    sleep 5
done
