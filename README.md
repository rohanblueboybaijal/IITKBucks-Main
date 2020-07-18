# IITKBucks-Main
This repository contains the main code for the Summer Project on developing a Cryptocurrency under Science and Technology Council, IITK.  
This is a functional crypto-currency miner (Mining as well as maintaining a working network).

# Starting the Miner   
Use the following commands  
```npm install```    
```node server.js```  

# About 
This implementation is written in ```Javascript``` and uses the ```Node.js``` framework. 

### Applications of Cryptography  
Made use of primitives like ```hashes and signatures``` to verify identity while maintaining anonymity and the concept of ***work*** done by a miner. I understood the use of some standard libraries like ```crypto``` in ```Node.js```.   

### OOPs concepts    
I used classes and methods as a way of abstracting the inner working (like byte-array conversions, verifications and mining).   
I'm happy about implementing the classes like that since it helped me reduce the size of my main application (but in the end it did become a little messy :|)   

### Javascript Features    
Some interesting features like ```asynchronous functions and promises``` did make the whole application pretty decent for back-end work but it often led me down to some callback hells and a lot of head-banging.

```Worker_threads``` was also an important as it allowed me to multi-thread my application. The whole process of finding ***Nonce*** is simply computationally expensive and a brute force process. Doing that in the main thread would have blocked other important functions.   

### BlockChain concepts   
This project gave me a pretty good insight about the basic architecture of BlockChain systems and the fundamental concepts which lead to the much deserved amazement about it.   

### Drawbacks and possible improvemements   
The implementation is in ```Node.js``` (essentially ```Javascript```) and so it is slow compaared to other languages like ```GoLang```. I realised this towards the end when I actually had to start mining the blocks and make my program do the heavy-lifting.   

Some aspects related to peer communication might not be very robust.   
The ```server.js``` could be made a little cleaner with some better handling of requests.   
The current implementation makes heavy use of ```Buffers``` as data members of ```Transaction``` and ```Block``` classes. Incase of scaling, this may have an adverse effect on the speed and memory requirements of the program.   

## Personal Experience   
I had a lot of fun working on this project and doing the assignments. The whole design of the project was very clear and intuitive, thanks to the great effort by the mentor.   
I understood a lot of aspsects about working with ```Javascript``` and other libraries. 

## Author 
Rohan Baijal : https://github.com/rohanblueboybaijal

## Mentor 
Priydarshi Singh : https://github.com/dryairship
