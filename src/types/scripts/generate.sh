#!/bin/bash

echo '// Generated file, do not edit!' > .work/generated_test.ts
find -iname '*.spec.ts' \
     -not -wholename '*node_modules*' \
     -exec node -p 'x = "{}";`import * as ${x.replace(/(\.\.?\/|\/)+|.spec.ts$/g,"")} from "../${x.substr(0,x.length-3)}"\nexport { ${x.replace(/(\.\.?\/|\/)+|.spec.ts$/g,"")} }`' ';' \
     >> .work/generated_test.ts