---
id: export-logs
title: Exporting Logs from GlueOps
---

# Export/Ship your logs to an external sink

:::danger
These docs are beta.
:::
 
We use the [fluent-operator](https://github.com/fluent/fluent-operator) to ship your logs however the version we run is not always the latest so it's best to verify the correct CRDs to use.

At a high level this doc will cover collecting logs, parsing/modify logs, and shipping logs.


## Collecting Logs (INPUTS)

```yaml title="Example to collect all container logs"
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterInput
metadata:
  labels:
    logging.glueops.dev: 'glueops-core-primary' # needs to match the label defined in: ClusterFluentBitConfig
  name: 'glueops-core-platform-cri-primary' # Must be unique among all objects of same type
  namespace: glueops-core-fluent-operator
spec:
  tail:
    db: /fluent-bit/tail/pos.db
    dbSync: Full
    memBufLimit: 100MB
    parser: cri
    path: /var/log/containers/*.log
    readFromHead: false
    refreshIntervalSeconds: 10
    skipLongLines: true
    #storageType: filesystem
    tag: kube.*
---
```
```yaml title="Collect systemd service logs"
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterInput
metadata:
  labels:
    logging.glueops.dev: 'glueops-core-primary' # needs to match the label defined in: ClusterFluentBitConfig
  name: 'glueops-core-platform-sysd-primary' # Must be unique among all objects of same type
  namespace: glueops-core-fluent-operator
spec:
  systemd:
    tag: service.*
    path: /var/log/journal
    dbSync: Normal
    systemdFilter:
      - _SYSTEMD_UNIT=kubelet.service
      - _SYSTEMD_UNIT=k3s.service
      - _SYSTEMD_UNIT=sshd.service
      - _SYSTEMD_UNIT=containerd.service
      - _SYSTEMD_UNIT=docker.service
    readFromTail: "on"
---
```

## Defining a JSON parser:

```yaml title="Define a custom Parser"
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterParser
metadata:
  labels:
    logging.glueops.dev: 'glueops-core-primary' # needs to match the label defined in: ClusterFluentBitConfig
  name: 'glueops-json' # Must be unique among all objects of same type and match the name defined in ClusterFilter
  namespace: glueops-core-fluent-operator  
spec:
  json:
    timeFormat: "%Y-%m-%dT%H:%M:%S" # ISO 8601 standard
    timeKey: "time"
---
```

## Defining a custom lua script:

```yaml title="Define custom lua script"
apiVersion: v1
kind: ConfigMap
metadata:
  labels:
    logging.glueops.dev: 'glueops-core-primary' # needs to match the label defined in: ClusterFluentBitConfig
  name: 'glueops-core-containerd-lua-script-primary' # Must be unique among all objects of same type and needs to match the name in the ClusterFilter objects
  namespace: glueops-core-fluent-operator 
data:
  containerd.lua: |
    function containerd( tag, timestamp, record)
            if(record["logtag"]~=nil)
            then
            timeStr = os.date("!*t",  timestamp["sec"])
            t = string.format("%4d-%02d-%02dT%02d:%02d:%02d.%sZ",
            timeStr["year"], timeStr["month"], timeStr["day"],
            timeStr["hour"], timeStr["min"], timeStr["sec"],
            timestamp["nsec"]);
            record["time"] = t;
            record["log"] = record["message"];
            record["message"] =  nil;
            return 1, timestamp, record
            else
            return 0,timestamp,record
            end
    end
---
```


## Filtering/Parsing:

```yaml title="Define filters and parsers"
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterFilter
metadata:
  labels:
    logging.glueops.dev: 'glueops-core-primary' # needs to match the label defined in: ClusterFluentBitConfig
  name: glueops-core-filter-primary # Must be unique among all objects of same type
  namespace: glueops-core-fluent-operator
spec:
  filters:
    - lua:
        call: containerd
        script:
          key: containerd.lua
          name: glueops-core-containerd-lua-script-primary # needs to match the name of the script defined earlier
        timeAsTable: true
    - parser:
        alias: parsedata
        keyName: log
        parser: 'glueops-json' # see name used in ClusterParser definition
        reserveData: true
    - kubernetes:
        annotations: true
        kubeCAFile: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        kubeTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
        kubeURL: 'https://kubernetes.default.svc:443'
        labels: true
        mergeLogTrim: true
    - nest:
        addPrefix: kubernetes_
        nestedUnder: kubernetes
        operation: lift
    - modify:
        rules:
          - remove: stream
          - remove: kubernetes_pod_id
    - nest:
        nestUnder: kubernetes
        operation: nest
        removePrefix: kubernetes_
        wildcard:
          - kubernetes_*
  match: kube.*
---
```

## Defining Outputs:

```yaml title="Define filters and parsers"
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterOutput
metadata:
  labels:
    logging.glueops.dev: 'glueops-core-primary' # needs to match the label defined in: ClusterFluentBitConfig
  name: 'fluent-bit-datadog-output-primary' # Must be unique among all objects of same type
  namespace: glueops-core-fluent-operator
spec:
  matchRegex: (?:kube|service)\.(.*)
  datadog:
    host: 'http-intake.logs.us3.datadoghq.com' # change this to the respective region
    compress: gzip
    apikey: XXXXXXXXXXXXXXXXXXXXXXXX
    dd_source: 'nonprod.antoniostacos.onglueops.com' # update this to your cluster name
    dd_tags: 'captain_domain=nonprod.antoniostacos.onglueops.com,env=nonprod' # comma separated key value pairs
    tls: true
---
```

## Bringing it all together:


```yaml title="Define FluentbitConfig this will be used by the FluentBit object and tie things together"
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterFluentBitConfig
metadata:
  labels:
    logging.glueops.dev: 'glueops-core-primary' # needs to match the label used in the Fluentbit resource
  name: glueops-core-fluent-bit-config-primary  # Must be unique among all objects of same type
  namespace: glueops-core-fluent-operator
spec:
  filterSelector:
    matchLabels:
      logging.glueops.dev: 'glueops-core-primary' # Needs to match the label used in ClusterFilter
  inputSelector:
    matchLabels:
      logging.glueops.dev: 'glueops-core-primary' # needs to match the label used in ClusterInput
  outputSelector:
    matchLabels:
      logging.glueops.dev: 'glueops-core-primary' # needs to match the label used in ClusterOutput
  parserSelector:
    matchLabels:
      logging.glueops.dev: 'glueops-core-primary' # needs to match the label used in ClusterParser
  service:
    httpServer: true
    parsersFile: parsers.conf
    httpPort: 45072 # see FluentBit metrics port configuration
    # storage:
    #  path: "/host/fluent-bit-buffer/"
    #  backlogMemLimit: "50MB"
    #  checksum: "off"
    #  deleteIrrecoverableChunks: "on"
    #  maxChunksUp: 128
    #  metrics: "on"
    #  sync: normal
---
```

## Deploying the fluentbit daaemonset to ship logs:

```yaml title="Define Fluentbit daemonset (this actually deploys pods and takes up compute resources in the cluster"
apiVersion: rbac.authorization.k8s.io/v1
apiVersion: fluentbit.fluent.io/v1alpha2
kind: FluentBit
metadata:
  name: glueops-core-primary # Must be unique among all objects of same type
  labels:
    logging.glueops.dev: 'glueops-core-primary'  # needs to match the label used in ClusterFluentBitConfig 
  namespace: glueops-core-fluent-operator
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: node-role.kubernetes.io/edge
                operator: DoesNotExist
  dnsPolicy: ClusterFirstWithHostNet
  fluentBitConfigName: 'glueops-core-fluent-bit-config-primary' # needs to match the ClusterFluentBitConfig object name
  hostNetwork: true
  metricsPort: 45072 # needs to be unique across the cluster AND match the httpPort defined in ClusterFluentBitConfig
  envVars:
  - name: KEY_NAME # keyvalue pairs of environment variables can be set here. Ex. AWS credentials and more.
    value: "VALUE"
  ports:
    - containerPort: 45073 # needs to be unique across the cluster
      name: "fluentbit"
  image: "docker.io/kubesphere/fluent-bit:v2.2.0" # to make debugging easier, add a -debug to the suffix of the image name. Ex. docker.io/kubesphere/fluent-bit:v2.2.0-debug
  positionDB:
    hostPath:
      path: /var/lib/fluent-bit/
  resources:
    limits:
      cpu: 500m
      memory: 200Mi
    requests:
      cpu: 10m
      memory: 25Mi
  tolerations:
    - operator: Exists
  # volumes:
  #   - name: hostbuffer
  #     hostPath:
  #       path: /tmp/fluent-bit-buffer
  # volumesMounts:
  #   - mountPath: /host/fluent-bit-buffer
  #     mountPropagation: HostToContainer
  #     name: hostbuffer
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  namespace: glueops-core-fluent-operator
  name: glueops-core-primary # Must be unique among all objects of same type
spec:
  endpoints:
    - port: metrics
      path: /api/v2/metrics/prometheus
      interval: 5s
  selector:
    matchLabels:
      logging.glueops.dev: 'glueops-core-primary'  # needs to match the label used in ClusterFluentBitConfig 
```



Additional resources:
- CRDs: https://doc.crds.dev/github.com/fluent/fluent-operator@v2.7.0
- General docs as the CRDs are lacking information: https://docs.fluentbit.io/manual/v/dev-2.2
