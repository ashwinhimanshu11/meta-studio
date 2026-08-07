const { exec } = require('child_process');
exec(`python -c "import sys; print(sys.argv)" a b undefined`, (err, stdout) => console.log(stdout));
