
Create package with sample from src/samples/test:

```
npm run prepare-sample-tar
```
---
Analyze package:

```
cat sample-package/package.tar.gz | npm start
```
Returns
```
{
  "engines": {
    "node": ">=10",
    "scramjet": ">=0.9"
  },
  "image": "node"
}
```

The created volume remains available and contains the unpacked package.
