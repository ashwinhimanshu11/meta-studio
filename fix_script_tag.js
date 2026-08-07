const fs = require('fs');
let html = fs.readFileSync('image-editor-window.html', 'utf8');

// The code starts with "// Custom Dropdown Logic"
const startIndex = html.indexOf('// Custom Dropdown Logic');
if (startIndex !== -1) {
  // Find the end of the block (before the </script> we incorrectly inserted)
  const endIndex = html.indexOf('</script>', startIndex);
  if (endIndex !== -1) {
    const jsCode = html.substring(startIndex, endIndex);
    
    // Remove the incorrect injection completely
    html = html.substring(0, startIndex) + html.substring(endIndex);
    
    // Find the LAST </script> tag
    const lastScriptIndex = html.lastIndexOf('</script>');
    if (lastScriptIndex !== -1) {
      html = html.substring(0, lastScriptIndex) + jsCode + html.substring(lastScriptIndex);
      fs.writeFileSync('image-editor-window.html', html);
      console.log("Fixed script injection");
    } else {
      console.log("Could not find last </script>");
    }
  }
} else {
  console.log("Could not find // Custom Dropdown Logic");
}
