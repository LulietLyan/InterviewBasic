# 🔴 概述

## Redis 为什么快？

- **基于内存操作**：Redis 的绝大部分操作在内存里就可以实现，数据也存在内存中，与传统的磁盘文件操作相比减少了 I/O，提高了操作的速度
- **高效的数据结构**：Redis 有专门设计了 STRING、LIST、HASH 等高效的数据结构，依赖各种数据结构提升了读写的效率
- **采用单线程**：单线程操作省去了上下文切换带来的开销和 CPU 的消耗，同时不存在资源竞争，避免了死锁现象的发生
- **I/O 多路复用**：采用 I/O 多路复用机制同时监听多个 Socket，根据 Socket 上的事件来选择对应的事件处理器进行处理

## 为什么 Redis 是单线程？

单线程指的是网络请求模块使用单线程进行处理，其他模块仍用多个线程。

官方答案是：因为 CPU 不是 Redis 的瓶颈，Redis 的瓶颈最有可能是机器内存或者网络带宽。既然单线程容易实现，而且 CPU 不会成为瓶颈，那就顺理成章地采用单线程的方案了。

> **redis 采用多线程的模块和原因**
> Redis 在启动的时候，会启动后台线程(BIO)：
> - Redis 的早期版本会启动 2 个后台线程，来处理关闭文件、AOF 刷盘这两个任务
> - Redis 的后续版本，新增了一个新的后台线程，用来异步释放 Redis 内存。执行 unlink key / flushdb async / flushall async 等命令，会把这些删除操作交给后台线程来执行
>
> 之所以 Redis 为关闭文件、AOF 刷盘、释放内存这些任务创建单独的线程来处理，是因为这些任务的操作都很耗时，把这些任务都放在主线程来处理会导致主线程阻塞，导致无法处理后续的请求。后台线程相当于一个消费者，生产者把耗时任务丢到任务队列中，消费者不停轮询这个队列，拿出任务去执行对应的方法即可。

## Redis 为什么要引入多线程？

因为 Redis 的瓶颈不在内存，而是在网络 I/O 模块带来 CPU 的耗时，所以 Redis6.0 的多线程是用来处理网络 I/O 这部分，充分利用 CPU 资源，减少网络 I/O 阻塞带来的性能损耗。Redis 引入的多线程 I/O 特性对性能提升至少是一倍以上。

## 为什么用 Redis 作为 MySQL 的缓存？

MySQL 是数据库系统，对于数据的操作需要访问磁盘，而将数据放在 Redis 中，需要访问就可以直接从内存获取，避免磁盘I/O，提高操作的速度。

使用 Redis + MySQL 结合的方式可以有效提高系统 QPS。

## Redis 和 Memcached 的联系和区别？

### 共同点

- 都是内存数据库
- 性能都非常高
- 都有过期策略

### 区别

- **线程模型**：Memcached 采用多线程模型，并且基于 I/O 多路复用技术，主线程接收到请求后分发给子线程处理，这样做好的好处是：当某个请求处理比较耗时，不会影响到其他请求的处理。缺点是 CPU 的多线程切换存在性能损耗，同时，多线程在访问共享资源时要加锁，也会在一定程度上降低性能；Redis 也采用 I/O 多路复用技术，但它处理请求采用是单线程模型，从接收请求到处理数据都在一个线程中完成。这意味着使用 Redis 一旦某个请求处理耗时比较长，那么整个 Redis 就会阻塞住，直到这个请求处理完成后返回，才能处理下一个请求，使用 Redis 时一定要避免复杂的耗时操作，单线程的好处是，少了 CPU 的上下文切换损耗，没有了多线程访问资源的锁竞争，但缺点是无法利用 CPU 多核的性能
- **数据结构**：Memcached 支持的数据结构很单一，仅支持 string 类型的操作。并且对于 value 的大小限制必须在 1MB 以下，过期时间不能超过 30 天；而 Redis 支持的数据结构非常丰富，除了常用的数据类型 string、list、hash、set、zset 之外，还可以使用 geo、hyperLogLog 数据类型；使用 Memcached 时，我们只能把数据序列化后写入到 Memcached 中。然后再从 Memcached 中读取数据，再反序列化为我们需要的格式，只能“整存整取”；Redis 提供的数据结构提升了操作的便利性
- **淘汰策略**：Memcached 必须设置整个实例的内存上限，数据达到上限后触发 LRU 淘汰机制，优先淘汰不常用使用的数据。它的数据淘汰机制存在一些问题：刚写入的数据可能会被优先淘汰掉，这个问题主要是它本身内存管理设计机制导致的；Redis 没有限制必须设置内存上限，如果内存足够使用，Redis 可以使用足够大的内存，同时 Redis 提供了多种内存淘汰策略
- **持久化**：Memcached 不支持数据的持久化，如果 Memcached 服务宕机，那么这个节点的数据将全部丢失。Redis 支持 AOF 和 RDB 两种持久化方式
- **集群**：Memcached 没有主从复制架构，只能单节点部署，如果节点宕机，那么该节点数据全部丢失，业务需要对这种情况做兼容处理，当某个节点不可用时，把数据写入到其他节点以降低对业务的影响；Redis 拥有主从复制架构，主节点从可以实时同步主的数据，提高整个 Redis 服务的可用性

## 如何理解 Redis 原子性操作原理？

- **API**：Redis 提供的 API 都是单线程串行处理的
- **网络模型**：采用单线程的 epoll 的网络模型，用来处理多个 Socket 请求
- **请求处理**：Redis 会 fork 子进程来出来类似于 RDB 和 AOF 的操作，不影响主进程工作


# 🔵 数据结构

## Redis 数据类型？

主要有 STRING，LIST，ZSET，SET，HASH。

### STRING

String 类型的底层的数据结构实现主要是 SDS(简单动态字符串)。应用场景主要有：

- **缓存对象**：例如可以用 STRING 缓存整个对象的 JSON
- **计数**：Redis 处理命令是单线程，所以执行命令的过程是原子的，因此 String 数据类型适合计数场景，比如计算访问次数、点赞、转发、库存数量等等
- **分布式锁**：可以利用 SETNX 命令
- **共享 Session 信息**：服务器都会去同一个 Redis 获取相关的 Session 信息，解决了分布式系统下 Session 存储的问题


### LIST

List 类型的底层数据结构是由**双向链表或压缩列表**实现的：

- 如果列表的元素个数小于 512 个，列表每个元素的值都小于 64 字节，Redis 会使用**压缩列表**作为 List 类型的底层数据结构；
- 如果列表的元素不满足上面的条件，Redis 会使用**双向链表**作为 List 类型的底层数据结构；

在 Redis 3.2 版本之后，List 数据类型底层数据结构只由 quicklist 实现，替代了双向链表和压缩列表。在 Redis 7.0 中，压缩列表数据结构被废弃，由 listpack 来实现。应用场景主要有：

- **微信朋友圈点赞**：要求按照点赞顺序显示点赞好友信息，如果取消点赞，移除对应好友信息
- **消息队列**：可以使用左进右出的命令组成来完成队列的设计。比如：数据的生产者可以通过 Lpush 命令从左边插入数据，多个数据消费者，可以使用 BRpop 命令阻塞的抢列表尾部的数据

### HASH

Hash 类型的底层数据结构是由压缩列表或哈希表实现的：

- 如果哈希类型元素个数小于 512 个，所有值小于 64 字节的话，Redis 会使用压缩列表作为 Hash 类型的底层数据结构；
- 如果哈希类型元素不满足上面条件，Redis 会使用哈希表作为 Hash 类型的底层数据结构。

在Redis 7.0 中，压缩列表数据结构被废弃，交由 listpack 来实现。应用场景主要有：

- **缓存对象**：一般对象用 String + Json 存储，对象中某些频繁变化的属性可以考虑抽出来用 Hash 类型存储
- **购物车**：以用户 id 为 key，商品 id 为 field，商品数量为 value，恰好构成了购物车的 3 个要素

### SET

Set 类型的底层数据结构是由**哈希表或整数集合**实现的：

- 如果集合中的元素都是整数且元素个数小于 512个，Redis 会使用**整数集合**作为 Set 类型的底层数据结构
- 如果集合中的元素不满足上面条件，则 Redis 使用**哈希表**作为 Set 类型的底层数据结构

应用场景主要有：

- **点赞**：key 是文章 id，value 是用户 id
- **共同关注**：Set 类型支持交集运算，所以可以用来计算共同关注的好友、公众号等。key 可以是用户 id，value 则是已关注的公众号的 id
- **抽奖活动**：存储某活动中中奖的用户名 ，Set 类型因为有去重功能，可以保证同一个用户不会中奖两次

> **提示**
> Set 的差集、并集和交集的计算复杂度较高，在数据量较大的情况下，如果直接执行这些计算，会导致 Redis 实例阻塞。在主从集群中，为了避免主库因为 Set 做聚合计算(交集、差集、并集)时导致主库被阻塞，可以选择一个从库完成聚合统计，或者把数据返回给客户端，由客户端来完成聚合统计。

### Zset

Zset 类型(Sorted Set，有序集合)可以根据元素的权重来排序，可以自己来决定每个元素的权重值。比如说，可以根据元素插入 Sorted Set 的时间确定权重值，先插入的元素权重小，后插入的元素权重大。应用场景主要有：

- 在面对需要展示最新列表、排行榜等场景时，如果数据更新频繁或者需要分页显示，可以优先考虑使用 Zset
- **排行榜**：有序集合比较典型的使用场景就是排行榜。例如学生成绩的排名榜、游戏积分排行榜、视频播放排名、电商系统中商品的销量排名等

### BitMap

bit 是计算机中最小的单位，使用它进行储存将非常节省空间，特别适合一些数据量大且使用二值统计的场景。可以用于签到统计、判断用户登陆态等操作。

### HyperLogLog

HyperLogLog 用于基数统计，统计规则是基于概率完成的，不准确，标准误算率是 0.81%。优点是，在输入元素的数量或者体积非常非常大时，所需的内存空间总是固定的、并且很小。比如百万级网页 UV 计数等；

### dGEO

主要用于存储地理位置信息，并对存储的信息进行操作。底层是由 Zset 实现的，使用 GeoHash 编码方法实现了经纬度到 Zset 中元素权重分数的转换，这其中的两个关键机制就是「对二维地图做区间划分」和「对区间进行编码」。一组经纬度落在某个区间后，就用区间的编码值来表示，并把编码值作为 Zset 元素的权重分数。

### Stream

Redis 专门为消息队列设计的数据类型。相比于基于 List 类型实现的消息队列，有这两个特有的特性：自动生成全局唯一消息 ID，支持以消费组形式消费数据。

之前方法缺陷：不能持久化，无法可靠的保存消息，并且对于离线重连的客户端不能读取历史消息。

## Redis 底层数据结构？

### SDS

SDS 不仅可以保存文本数据，还可以保存二进制数据。

O(1) 复杂度获取字符串长度，因为有 Len 属性。

不会发生缓冲区溢出，因为 SDS 在拼接字符串之前会检查空间是否满足要求，如果空间不够会自动扩容，所以不会导致缓冲区溢出的问题。

### 链表

节点是一个双向链表，在双向链表基础上封装了listNode这个数据结构。包括链表节点数量 len、以及可以自定义实现的 dup、free、match 函数。

- listNode 链表节点的结构里带有 prev 和 next 指针，获取某个节点的前置节点或后置节点的时间复杂度只需 O(1)，而且这两个指针都可以指向 NULL，所以链表是无环链表；
- list 结构因为提供了表头指针 head 和表尾节点 tail，所以获取链表的表头节点和表尾节点的时间复杂度只需O(1)；

缺陷：

- 链表每个节点之间的内存都是不连续的，无法很好利用 CPU 缓存。能很好利用 CPU 缓存的数据结构是数组，因为数组的内存是连续的
- 保存一个链表节点的值都需要一个链表节点结构头的分配，内存开销较大

### 压缩列表### 

压缩列表是由连续内存块组成的顺序型数据结构，类似于数组。不仅可以利用 CPU 缓存，而且会针对不同长度的数据，进行相应编码，这种方法可以有效地节省内存开销。不能保存过多的元素，否则查询效率就会降低；新增或修改某个元素时，压缩列表占用的内存空间需要重新分配，甚至可能引发连锁更新的问题。

缺陷：

- 空间扩展操作也就是重新分配内存，因此连锁更新一旦发生，就会导致压缩列表占用的内存空间要多次重新分配，直接影响到压缩列表的访问性能
- 如果保存的元素数量增加了，或是元素变大了，会导致内存重新分配，会有连锁更新的问题
- 压缩列表只会用于保存的节点数量不多的场景，只要节点数量足够小，即使发生连锁更新也能接受

### 哈希

哈希表是一种保存键值对(key-value)的数据结构。优点在于能以 O(1) 的复杂度快速查询数据。Redis 采用了拉链法来解决哈希冲突，在不扩容哈希表的前提下，将具有相同哈希值的数据串起来，形成链接。渐进式哈希的过程如下：

Redis 定义一个 dict 结构体，这个结构体里定义了**两个哈希表(ht[2])**。

- 给 ht2 分配空间
- 在 rehash 进行期间，每次哈希表元素进行新增、删除、查找或者更新操作时，Redis 除了会执行对应的操作之外，还会顺序将ht1中索引位置上的所有数据迁移到 ht2 上
- 随着处理客户端发起的哈希表操作请求数量越多，最终在某个时间点会把「哈希表 1 」的所有 key-value 迁移到「哈希表 2」，从而完成 rehash 操作

> **tip 渐进式哈希的触发条件？**
> 负载因子 = 哈希表已保存节点数/哈希表大小
> 
> 当负载因子大于等于 1 ，没有执行 RDB 快照或没有进行 AOF 重写的时候，就会进行 rehash 操作。
> 
> 当负载因子大于等于 5 时，此时说明哈希冲突非常严重了，不管有没有有在执行 RDB 快照或 AOF 重写，都会强制进行 rehash 操作。

### 跳表

一种多层的有序链表，能快读定位数据。当数据量很大时，跳表的查找复杂度就是 O(logN)。

节点同时保存元素和元素的权重，每个跳表节点都有一个后向指针，指向前一个节点，目的是为了方便从跳表的尾节点开始访问节点，为了倒序查找时方便。跳表是一个带有层级关系的链表，而且每一层级可以包含多个节点，每一个节点通过指针连接起来。Zset 数组中一个属性是 level 数组，一个 level 数组就代表跳表的一层，定义了指向下一个节点的指针和跨度。

> **tip 跳表的查找过程？**
> 查找一个跳表节点的过程时，跳表会从头节点的最高层开始，逐一遍历每一层。在遍历某一层的跳表节点时，会用跳表节点中的 SDS 类型的元素和元素的权重来进行判断：
> - 如果当前节点的权重小于要查找的权重时，跳表就会访问该层上的下一个节点。
> - 如果当前节点的权重等于要查找的权重时，并且当前节点的 SDS 类型数据小于要查找的数据时，跳表就会访问该层上的下一个节点。
> 
> 如果上面两个条件都不满足，或者下一个节点为空时，跳表就会使用目前遍历到的节点的 level 数组里的下一层指针，然后沿着下一层指针继续查找。

跳表的相邻两层的节点数量的比例会影响跳表的查询性能。相邻两层的节点数量最理想的比例是 2:1，查找复杂度可以降低到 O(logN)。为了防止插入删除时间消耗，跳表在创建节点的时候，随机生成每个节点的层数。具体的做法是，跳表在创建节点时候，会生成范围为 [0-1] 的一个随机数，如果这个随机数小于 0.25(相当于概率 25%)，那么层数就增加 1 层，然后继续生成下一个随机数，直到随机数的结果大于 0.25 结束，最终确定该节点的层数。

### 整数集合

整数集合本质上是一块连续内存空间。

整数集合有一个升级规则，就是当将一个新元素加入到整数集合里面，如果新元素的类型(int32_t)比整数集合现有所有元素的类型(int16_t)都要长时，整数集合需要先进行升级，也就是按新元素的类型(int32_t)扩展 contents 数组的空间大小，然后才能将新元素加入到整数集合里，升级的过程中也要维持整数集合的有序性。

### quicklist

其实 quicklist 就是双向链表 + 压缩列表组合，quicklist 就是一个链表，而链表中的每个元素又是一个压缩列表。quicklist 解决办法，通过控制每个链表节点中的压缩列表的大小或者元素个数，来规避连锁更新的问题。因为压缩列表元素越少或越小，连锁更新带来的影响就越小，从而提供了更好的访问性能。

### listpack

listpack 没有压缩列表中记录前一个节点长度的字段了，listpack 只记录当前节点的长度，当向 listpack 加入一个新元素的时候，不会影响其他节点的长度字段的变化，从而避免了压缩列表的连锁更新问题。

## 为什么用跳表而不用平衡树？

- **从内存占用上来比较，跳表比平衡树更灵活一些**：平衡树每个节点包含 2 个指针(分别指向左右子树)，而跳表每个节点包含的指针数目平均为 1/(1 - p)，如果像 Redis里的实现一样，取 p = 1/4，那么平均每个节点包含 1.33 个指针，比平衡树更有优势
- **在做范围查找的时候，跳表比平衡树操作要简单**：在平衡树上，找到指定范围的小值之后，还需要以中序遍历的顺序继续寻找其它不超过大值的节点。如果不对平衡树进行一定的改造，这里的中序遍历并不容易实现。而在跳表上进行范围查找就非常简单，只需要在找到小值之后，对第 1 层链表进行若干步的遍历就可以实现
- **从算法实现难度上来比较，跳表比平衡树要简单得多**：平衡树的插入和删除操作可能引发子树的调整，逻辑复杂，而跳表的插入和删除只需要修改相邻节点的指针，操作简单又快速

# 🟢 持久化



# 🟡 应用



# 🟣 集群


