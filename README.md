# IITKBucks-Main
This repository contains the main code for the Summer Project on developing a Cryptocurrency under Science and Technology Council, IITK.  
This is a functional crypto-currency miner (Mining as well as maintaining a working network).

# Starting the Miner   
Use the following commands  
```npm install```    
```node server.js```  

### Additional Requirements   
Go inside the main repo and run the following commands to create the files and blocks necessary for storage 
```   
mkdir blocks 
touch parentHash.json
touch peers.json
touch aliasMap.json
touch unusedOutputs.json
```
```ngrok http 8000```
You should get a link in the terminal (you've created a tunnel to the web for your local host application).  
Manually set these in ```line 27 in server.js``` : ```const myURL = <ngrok url>```
Do the same in ```line 13 in interact.js``` : ```const myURL = <>ngrok url>```

### The Working  
Upon starting the node tries to find peers in order to become a part of the network. This is important so that new transactions and blocks get propagated throughout the network.   
It then requests one peer for all the ***blocks mined until now*** and also the ***pending transactions***.    
Once we are up-to-date the node will start mining as and when it gets new transactions.   
I've also programmed it to start mining afresh every 8 minutes.    

### Interaction   
Open a separate terminal and go into the ```IITKBucks-Main``` folder.   
Run ```node interact.js```   
Here you will get options to ***add and alias***, ***check balance***, ***register***(generate a key-pair) and ***transfer coins***  

Have fun mining :p


# About 
This implementation is written in ```Javascript``` and uses the ```Node.js``` framework. 

### Applications of Cryptography  
Made use of primitives like ```hashes and signatures``` to verify identity while maintaining anonymity and the concept of ***work*** done by a miner. I understood the use of some standard libraries like ```crypto``` in ```Node.js```.   

### OOPs concepts    
I used classes and methods as a way of abstracting the inner working (like byte-array conversions, verifications and mining).   
I'm happy about implementing the classes like that since it helped me reduce the size of my main application (but in the end it did become a little messy :|)   

### Javascript Features    
Some interesting features like ```asynchronous functions and promises``` did make the whole application pretty decent for back-end work but it often led me down to some callback hells and a lot of head-banging.

```Worker_threads``` was also important as it allowed me to multi-thread my application. The whole process of finding ***Nonce*** is simply computationally expensive and a brute force process. Doing that in the main thread would have blocked other important functions.   

### BlockChain concepts   
This project gave me a pretty good insight about the basic architecture of BlockChain systems and the fundamental concepts which lead to the much deserved amazement about it.   

### Drawbacks and possible improvemements   
The implementation is in ```Node.js``` (essentially ```Javascript```) and so it is slow compaared to other languages like ```GoLang```. I realised this towards the end when I actually had to start mining the blocks and make my program do the heavy-lifting.   

Some aspects related to peer communication might not be very robust.   
Currently I have assumed that I am asking ```https://iitkbucks.pclub.in``` for all the blocks in order to get up-to-date. So the process of requesting these existing blocks and finding peers runs simultaneously.   

I would like to improve the implementation of this part so that I ***first establish communication*** and ***then request for blocks***.

The ```server.js``` could be made a little cleaner with some better handling of requests.   
Use of config files for some constants.   
The current implementation makes heavy use of ```Buffers``` as data members of ```Transaction``` and ```Block``` classes. Incase of scaling, this may have an adverse effect on the speed and memory requirements of the program.   

## Personal Experience   
I had a lot of fun working on this project and doing the assignments. The whole design of the project was very clear and intuitive, thanks to the great effort by the mentor.   
I understood a lot of aspsects about working with ```Javascript``` and other libraries. 

## Author 
Rohan Baijal : https://github.com/rohanblueboybaijal

## Mentor 
Priydarshi Singh : https://github.com/dryairship
