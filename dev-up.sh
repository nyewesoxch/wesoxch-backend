#!/bin/bash
sudo systemctl start postgresql
pg_lsclusters | tail -1
if adb devices | grep -q "device$"; then
  adb reverse tcp:5000 tcp:5000 && echo "Phone tunnel ready"
else
  echo "No phone found. Plug it in, unlock it, accept the USB debugging prompt."
fi
echo ""
echo "Now open two terminals:"
echo "  1) cd ~/wesoxch/backend && npm run dev"
echo "  2) cd ~/wesoxch/mobile && npx expo start --tunnel"
