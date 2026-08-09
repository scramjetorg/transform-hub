## Example of deployment:

`helm upgrade --install sth charts/ --namespace <namespace>`

```bash
helm upgrade --install sth charts/ --namespace default
```

## Delete deployment

```bash
helm delete <release.name> charts/ --namespace=<namespace>
```
