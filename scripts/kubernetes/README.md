# Transform Hub on Kubernetes

This example assumes deployment to `default` namespace. Prepared policies (RBAC) allow `runner` POD creation in the same namespace as STH.

If you want to change the namespace, please edit manifests and change `namespace: default` as needed. Also please remember to change one of transform-hub argument `- "--k8s-namespace=default"` in `sth-deployment.yaml` to correct namespace.


## Run RBAC related yaml file which will setup all the authorization related stuff:

```bash
kubectl apply -f sth-rbac.yaml
kubectl apply -f sth-secret.yaml
kubectl apply -f sth-serviceaccount.yaml
```

## If you have a default network policy to deny, you can also add NetworkPolicy:

```bash
kubectl apply -f sth-networkpolicy.yaml
```

## Run pod related yaml file which will setup STH pod:

```bash
kubectl apply -f sth-deployment.yaml
```

## Run services related yaml file which will setup network configuration and expose STH ports:

```bash
kubectl apply -f sth-service.yaml
```

Check NodePort:

```bash
kubectl get svc -l app=sth
```

Output:
```
NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
sth-api      NodePort    10.111.75.239    <none>        8000:30030/TCP   14m
sth-runner   ClusterIP   10.103.128.166   <none>        8001/TCP         4m40s
```

In this example kubernetes exposed our `sth-api` on port `30030`

Now, we have to check on what node our STH pod is running, to do this You can type:

``` bash
kubectl get pod -l app=sth -o wide
```

Output:
```
NAME                   READY   STATUS             RESTARTS   AGE     IP              NODE                 NOMINATED NODE   READINESS GATES
sth-9cbc9f6d9-kr9jp    1/1     Running            0          26m     10.100.9.246    k8s-node-dev06   <none>           <none>
```

So, now you can check version of transform-hub

```bash
curl -s http://k8s-node-dev06:30030/api/v1/version
{"version":"0.16.0"}
```
