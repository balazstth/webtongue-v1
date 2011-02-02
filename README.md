Webtongue v1
===

This language was design as my bachelor's thesis in 2004. It was the dusk of the _Web 1.0_ era, when people wanted to focus on advanced languages like Forth, Rebol, Lisp and the like but none of these were available to them universally, like in a web page's client side.

The files checked into this repository are my original ones from back then, only URLs and my email address is actualized. It runs perfectly offline, just clone the repo or download the zip file and open index.html in your browser (I tried FF, Chrome and Safari). Docs and examples are included in the web pages.

[Online interpreter](http://balazstth.github.com/webtongue-v1) can be used, too.

I really think that this small language has great educational power so feel free to use it to that end (or any other).

### Code snippets ###

"Classic" factorial:
    
    let fac
    {
       get n
    
       if not gteq n 0
          { let ret 0 }
          { if eq n 0
             { let ret 1 }
             { let ret mul n run fac dec n }
          }
       let ret ret
    }
    
    print run fac 6   ** prints 720 **
    
"Stack-only" factorial:
    
    let fac
    {
       if not eq peek top 1
          { push dec peek top run fac push mul pop pop }
          nop
    }
    
    push 6
    run fac
    print pop   ** prints 720 **
    
Fibonacci numbers:
    
    let fibo
    {
       get fibo_n
    
       let oldfib -1
       let fib 1
    
       loop fibo_n
       {
          let newfib add oldfib fib
          let oldfib fib
          let fib newfib
          let fibo_n dec fibo_n
       }
       let fib fib
    }
    
    let printfibo
    {
       get n
    
       push add n 2
       let i { sub peek top n }
       loop n { print run fibo run i print ws let n dec n }
       pop
    }
    
    run printfibo 10

