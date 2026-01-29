我需要开发一个群晖系统 迁移到 zimaos系统的迁移 docker 应用 名字叫stoz

用户通过docker compos部署

需求
容器挂载 群晖根目录到stoz的/host目录
/:/host:ro

stoz内部扫描/host目录下的所有/volume开头的文件夹中的文件夹 并将所有非@开头的文件夹展示在前端 供用户选择迁移


例如
```bash
/host/volume3 # ls
@ActiveBackup                @database
@ActiveBackup-GSuite         @docker
@S2S                         @eaDir
@SynoDrive                   @sharesnap
@SynoFinder-etc-volume       @synoconfd
@SynoFinder-log              @synologydrive
@SynologyApplicationService  @tmp
@SynologyDriveShareSync      @userpreference
@USBCopy                     ActiveBackupforBusiness_1
@appconf                     Demo Sync with ZimaOS
@appdata                     MinimServer
@apphome                     OWSpeedup
@appshare                    PlexMediaServer
@appstore                    collin
@apptemp                     collin-test-多用户
@cloudsync                   test1
/host/volume3 # 
```