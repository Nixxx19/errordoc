Output demo.gif

Set FontSize 16
Set Width 900
Set Height 500
Set Theme "Dracula"
Set Padding 20

Type `echo "const express = require('express')" > /tmp/test.js`
Enter
Sleep 1s

Type `node /tmp/test.js 2>&1 | errordoc`
Enter
Sleep 3s

Type `errordoc "TypeError: Cannot read properties of undefined (reading 'map')"`
Enter
Sleep 3s

Type `errordoc "error[E0382]: use of moved value: data"`
Enter
Sleep 3s
