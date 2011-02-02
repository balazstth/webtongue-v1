// Online script interpreter by Balazs Toth (c) 2003, 2004
// balazstth at gmail dot com

//==============================================================================
// Globals
//==============================================================================

// variable class
function variable(name, argumentCount, isBuiltIn, value)
{
	this.name = name
	this.argumentCount = argumentCount
	this.isBuiltIn = isBuiltIn
	this.value = value
}

// JavaScript bugfix
function _isNaN(arg)
{
	var _value

	arg = parseFloat(arg)
	_value = isNaN(arg)
	return _value
}

//==============================================================================

function initGlobals()
{
	wsre = /\s+/

	builtIn = true // variable types
	user = false   //

	// Error messages

	invalidBlockValue = "Invalid block value."
	invalidImmediateStringValue = "Invalid immediate string value."
	invalidSubroutineReference = "Invalid subroutine reference."
	unexpectedEndOfSourceCode = "Unexpected end of source code."
	openComment = "Open comment in current program block."
	invalidParameterForLet = "Invalid parameter for let."
	invalidParameterForPrint = "Invalid parameter for print."
	invalidParameterForPrintln = "Invalid parameter for println."
	programQueueIsEmpty = "Program queue is empty."
	invalidParameterForRun = "Run should be called with immediate string or predefined string parameter."
	invalidArgument = "Invalid argument."
	invalidIteratorVariableForLoop = "Invalid iterator variable for loop."
	invalidBlockArgumentForLoop = "Invalid block argument for loop."
	iteratorTypeMustNotBeChanged = "Iterator variable type must not be changed during loop."
	parameterCannotBeConvertedToNumber = "Parameter cannot be converted to number."
	invalidBlockArgumentForIf = "Invalid block argument for if."
	stackUnderflow = "Stack underflow."
	invalidStackReference = "Invalid stack reference."
	builtInSubroutineCallRequired = "Built-in subroutine call required."
	divisionByZero = "Division by zero."
	
	// Global variables

	wordArray = []
	wordCount = 0xdeadbeef
	wordCurrent = 0xdeadbeef

	variableArray = []
	variableCount = 0xdeadbeef
	variableLastLookup = 0xdeadbeef

	stop = false
	output = ""
	
	programQueue = []
	programStack = []
	
	workStack = [] // general stack

	lastReturnValue = "N0pe."
	
	subroutineLevel = 0
	loopLevel = 0
	
	currentSubroutine = "N0pe." // debug var
	debug = false
	
	delimiterBlockBegin = "{"
	delimiterBlockEnd   = "}"
	delimiterComment    = "**"
	
	mezzanineLength = 0xdeadbeef
}

//==============================================================================

function initMezzanineFunctions()
{
	var mezzanineString
	var mezzanineArray = []
	var i
	
	mezzanineString = "let nop { } "
	mezzanineString += "let string { get ___p___ get ___p2___ if not gt ___p2___ 0 { error { invalid parameter for string } } nop let ___addr___ inc top loop ___p2___ { push ___p___ let ___p2___ dec ___p2___ } tostring ___addr___ } "
	mezzanineString += "let size { get ___p___ let ___addr___ inc top tostack ___p___ let ___ret___ sub top dec ___addr___ tostring ___addr___ let ___ret___ ___ret___ } "
	mezzanineString += "let read { get ___p___ get ___p2___ let ___addr___ inc top tostack ___p___ let ___ret___ peek add ___addr___ ___p2___ tostring ___addr___ let ___ret___ ___ret___ } "
	mezzanineString += "let write {	get ___p___ get ___p2___ get ___p3___ let ___addr___ inc top tostack ___p___ lift add ___addr___ ___p2___ pop push ___p3___ drop add ___addr___ ___p2___ tostring ___addr___ } "
	mezzanineString += "let ins { get ___p___ get ___p2___ get ___p3___ let ___addr___ inc top tostack ___p___ push ___p3___ drop add ___addr___ ___p2___ tostring ___addr___ } "
	mezzanineString += "let del { get ___p___ get ___p2___ let ___addr___ inc top tostack ___p___ lift add ___addr___ ___p2___ pop tostring ___addr___ } "
	mezzanineString += "let sqrt { get ___p___ pow ___p___ 0.5 } "
	mezzanineString += "let exp { get ___p___ pow e ___p___ } "
	mezzanineString += "let log { get ___p___ div ln ___p___ ln 10 } "
	mezzanineString += "let torad { get ___p___ div mul ___p___ pi 180 } "
	mezzanineString += "let todeg { get ___p___ div mul ___p___ 180 pi } "
	mezzanineString += "let dup { if not gteq top 0 { error { cannot dup with empty stack } } nop push peek top } "
	mezzanineString += "let swp { if not gteq top 1 { error { cannot swp with one or less element in stack } } nop drop dec top } "
	mezzanineString += "let rot { if not gteq top 2 { error { cannot rot with two or less elements in stack } } nop drop sub top 2 } "
	mezzanineString += "let clr { if gteq top 0 { tostring 0 } nop } "
	
	mezzanineArray = mezzanineString.split(wsre)
	if (mezzanineArray[mezzanineArray.length-1] == "") mezzanineArray.pop() // Firefox bugfix
	mezzanineArray = stripComments(mezzanineArray)
	mezzanineLength = mezzanineArray.length
	for (i=0; i < wordArray.length; i++)
	{
		mezzanineArray.push( wordArray[i] )
	}
	wordArray = mezzanineArray
}

//==============================================================================
// Subroutines
//==============================================================================

// error display and program termination
// displays position information if fpos is true
function error(msg, fpos)
{
	if (subroutineLevel) // in subroutine
	{
		if (debug)
		{
			if (fpos) window.alert("Webtongue error at subroutine level ( " + subroutineLevel + " ) block position ( " + wordCurrent + " ) word ( " + wordArray[wordCurrent-1] + " ):\n\n" + msg + "\n\nSender: " + currentSubroutine)
			else window.alert("Webtongue error:\n\n" + msg + "\n\nSender: " + currentSubroutine)
		}
		else // no debug
		{
			if (fpos) window.alert("Webtongue error at subroutine level ( " + subroutineLevel + " ) block position ( " + wordCurrent + " ) word ( " + wordArray[wordCurrent-1] + " ):\n\n" + msg)
			else window.alert("Webtongue error:\n\n" + msg)
		}
	}
	else // top level
	{
		if (debug)
		{
			if (fpos) window.alert("Webtongue error at subroutine level ( " + subroutineLevel + " ) block position ( " + (wordCurrent - mezzanineLength) + " ) word ( " + wordArray[wordCurrent-1] + " ):\n\n" + msg + "\n\nSender: " + currentSubroutine)
			else window.alert("Webtongue error:\n\n" + msg + "\n\nSender: " + currentSubroutine)
		}
		else // no debug
		{
			if (fpos) window.alert("Webtongue error at subroutine level ( " + subroutineLevel + " ) block position ( " + (wordCurrent - mezzanineLength) + " ) word ( " + wordArray[wordCurrent-1] + " ):\n\n" + msg)
			else window.alert("Webtongue error:\n\n" + msg)
		}
	}

	stop = true
	
	// TODO: more sophisticated error handling
}

//==============================================================================

// returns true if variable str is defined
// updates the variableLastLookup global variable (!)
function variableIsDefined(str)
{
	var i = 0
	var ret = false

	for (i=0; i < variableCount; i++)
	{
		if (variableArray[i].name == str.toLowerCase())
		{
			variableLastLookup = i
			ret = true
			break
		}
	}
	
	// TODO: more efficient lookup algorithm

	return ret
}

//==============================================================================

// one word lookahead
function lookAhead()
{
	if (wordCurrent >= wordCount) // +++ STOP +++
	{
		if (!stop) error(unexpectedEndOfSourceCode, false)
		return "N0pe."
	}
	if (wordArray[wordCurrent] == delimiterBlockBegin) return "string"
	else if ( variableIsDefined(wordArray[wordCurrent]) ) return "defined"
	else // number or unknown
	{
		if ( _isNaN(wordArray[wordCurrent]) ) return "unknown"
		else return "number"
	}
}

//==============================================================================

// read next word and increase word pointer
function parseNextWord()
{
	var n
	if (wordCurrent >= wordCount) // +++ STOP +++
	{
		error(unexpectedEndOfSourceCode, false)
		return "N0pe."
	}
	n = wordArray[wordCurrent]
	wordCurrent++
	return n
}

//==============================================================================

// read next immediate numeric value and increase word pointer
function parseNextNumber()
{
	var _value

	_value = parseFloat(parseNextWord())
	return _value
}

//==============================================================================

// returns next immediate string value
function parseNextString()
{
	var t, n
	var blocklevel
	
	n = ""
	blocklevel = 0
	
	t = parseNextWord()
	if (stop) return "N0pe." // +++ STOP +++
	if (t != delimiterBlockBegin)
	{
		error(invalidImmediateStringValue, true)
		return "N0pe."
	}
	t = parseNextWord()
	if (stop) return "N0pe." // +++ STOP +++
	while (true)
	{
		if (t == delimiterBlockEnd && !blocklevel) break

		if (stop) return // +++ STOP +++
		if (t == delimiterBlockBegin) blocklevel++
		if (t == delimiterBlockEnd) blocklevel--
		if (n == "") n = t
		else n += " " + t
		t = parseNextWord()
		if (stop) return "N0pe." // +++ STOP +++
	}
	return n
}

//==============================================================================

function parseNextArgument()
{
	var la
	var arg = "N0pe."
	
	workStack.push(variableLastLookup)
	
	la = lookAhead()
	if (stop) return "N0pe." // +++ STOP +++
	
	if (la == "number") arg = parseNextNumber()
	else if (la == "string") arg = parseNextString()
	else if (la == "defined")
	{
		parseNextWord()
		if (stop) return "N0pe." // +++ STOP +++
		if (variableArray[variableLastLookup].isBuiltIn == builtIn)
		{
			arg = variableArray[variableLastLookup].value()
		}
		else // user
		{
			arg = variableArray[variableLastLookup].value
		}
	}
	else // unknown
	{
		parseNextWord()
		error(invalidArgument, true) // +++ STOP +++
	}

	variableLastLookup = workStack.pop()
	
	return arg
}

//==============================================================================

// counts the leading get commands on every other location in the subroutine string
// (0., 2., 4., etc. word positions)
function paramCount(str)
{
	var _wordArray
	var _wordCount
	var i
	var n
	
	n = 0

	if ( _isNaN(str) ) // string
	{
		_wordArray = str.split(wsre)
		_wordCount = _wordArray.length
		i = 0
		while (i < _wordCount-2)
		{
			if (_wordArray[i].toLowerCase() == "get")
			{
				n++
				i += 2
			}
			else return n
		}
		return n
	}
	else return 0 // number
}

//==============================================================================

function stripComments(_wordArray)
{
	var __wordArray
	var i
	var inComment
	var commentClosed

	inComment = false
	commentClosed = false
	
	__wordArray = []
	if (_wordArray.length == 0 || _wordArray[0] == "")
	{
		stop = true
		return __wordArray
	}
	for (i=0; i < _wordArray.length; i++)
	{
		if (_wordArray[i] == delimiterComment)
		{
			if (inComment)
			{
				inComment = false
				commentClosed = true
			}
			else
			{
				inComment = true
			}
		}
		if (!inComment && !commentClosed) __wordArray.push(_wordArray[i])
		commentClosed = false
	}
	if (inComment)
	{
		error(openComment, false) // +++ STOP +++
		return __wordArray
	}
	return __wordArray
}

//==============================================================================

// defines new variable
// called from subLet() and subGet()
function newVariable(_name, _argumentCount, _isBuiltIn, _value)
{
	workStack.push(variableLastLookup)

	_name = _name.toLowerCase() // !!!
	if (variableIsDefined(_name))
	{
		variableArray[variableLastLookup].name = _name
		variableArray[variableLastLookup].argumentCount = _argumentCount
		variableArray[variableLastLookup].isBuiltIn = _isBuiltIn
		variableArray[variableLastLookup].value = _value
	}
	else
	{
		variableArray.push( new variable(_name, _argumentCount, _isBuiltIn, _value) )
		variableCount = variableArray.length
	}

	variableLastLookup = workStack.pop()
}

//==============================================================================

function evalSubroutine(str)
{
	workStack.push(wordArray)
	workStack.push(wordCount)
	workStack.push(wordCurrent)
	wordArray = str.split(wsre)
	wordCount = wordArray.length
	if (wordArray[0] == "") wordCount = 0
	wordCurrent = 0
	subroutineLevel++

	var stop2 = false

	while (!stop2)
	{
		currentSubroutine = "evalSubroutine()"
		
		if (wordCurrent >= wordCount)
		{
			stop2 = true
		}
		else
		{
			if ( variableIsDefined(parseNextWord()) )
			{
				if ( variableArray[variableLastLookup].isBuiltIn == user )
				{
					error(builtInSubroutineCallRequired, true)
					break
				}
				variableArray[variableLastLookup].value()
			}
			else
			{
				if (wordArray[wordCurrent-1] == "") stop2 = true // Firefox bugfix
				else error(invalidSubroutineReference, true)
			}
		}
		if (stop) stop2 = true
	}
		
	subroutineLevel--
	wordCurrent = workStack.pop()
	wordCount = workStack.pop()
	wordArray = workStack.pop()
}

//==============================================================================

// reads next numeric value, with auto-converting it
// reads from both defined and immediate string or numeric values
// may throw error (!)
function readNextNumber()
{
	var la
	var val
	
	_value = "N0pe."
	
	workStack.push(variableLastLookup)
	
	la = lookAhead()
	if (stop) return "N0pe."
	
	if (la == "defined")
	{
		parseNextWord()
		if (variableArray[variableLastLookup].isBuiltIn == builtIn)
		{
			_value = variableArray[variableLastLookup].value()
		}
		else // user
		{
			_value = variableArray[variableLastLookup].value
		}

		_value = parseFloat(_value)
		if ( _isNaN(_value) )
		{
			error(parameterCannotBeConvertedToNumber, true)
			return "N0pe."
		}
	}
	else if (la == "number")
	{
		_value = parseNextNumber()
	}
	else if (la == "string")
	{
		_value = parseNextString()
		if (stop) return "N0pe."
		_value = parseFloat(_value)
		if ( _isNaN(_value) )
		{
			error(parameterCannotBeConvertedToNumber, true)
			return "N0pe."
		}
	}
	else // unknown
	{
		parseNextWord()
		error(parameterCannotBeConvertedToNumber, true)
		return "N0pe."
	}

	variableLastLookup = workStack.pop()

	return _value
}

//==============================================================================

function readNextString()
{
	var _value
	
	_value = parseNextArgument()
	if (stop) return "N0pe."

	if ( !_isNaN(_value) ) // numeric value
	{
		_value = String(_value)
	}
	return _value
}

//==============================================================================

function areNumbers(arg1, arg2)
{
	var _value
	var _value2
	var numbers
	
	_value1 = arg1
	_value2 = arg2
	
	numbers = false

	// decide whether they are numbers...
	if ( _isNaN(_value) ) // string
	{
		_value = parseFloat(_value)
		if ( !_isNaN(_value) ) numbers = true // number anyway
	}
	else numbers = true // number

	if ( _isNaN(_value2) ) // string
	{
		_value2 = parseFloat(_value2)
		if ( _isNaN(_value2) ) numbers = false // string
	}

	return numbers
}

//==============================================================================

// no error checking !!!
function toNumber(arg)
{
	var _value
	
	_value = arg
	_value = parseFloat(_value)
	return _value
}

//==============================================================================
// Built-in Webtongue subroutines
//==============================================================================

function subLet()
{
	currentSubroutine = "subLet()"
	
	var _argumentCount
	var _value
	var _name
	var la
	
	_value = "N0pe."
	_name = parseNextWord()
	if (stop) return "N0pe." // +++ STOP +++

	la = lookAhead()
	if (stop) return "N0pe." // +++ STOP +++
	
	if (la == "unknown")
	{
		parseNextWord()
		error(invalidParameterForLet, true) // +++ STOP +++
	}
	// immediate values
	else if (la == "number")
	{
		_value = parseNextNumber()
		newVariable(_name, 0, user, _value)
	}
	else if (la == "string")
	{
		_value = parseNextString()
		if (stop) return "N0pe." // +++ STOP +++
		_argumentCount = paramCount(_value)
		newVariable(_name, _argumentCount, user, _value)
	}
	// already defined values
	else if (la == "defined")
	{
		parseNextWord() // read next word
		// built-in subroutines
		if (variableArray[variableLastLookup].isBuiltIn == builtIn)
		{
			_value = variableArray[variableLastLookup].value()
			_argumentCount = paramCount(_value)
			newVariable(_name, _argumentCount, user, _value)
		}
		else // user
		{
			_value = variableArray[variableLastLookup].value
			newVariable(_name,
				variableArray[variableLastLookup].argumentCount,
				variableArray[variableLastLookup].isBuiltIn,
				_value)
		}
	}

	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subPrint()
{
	currentSubroutine = "subPrint()"

	var value = "N0pe."
	var la = lookAhead()

	if (stop) return "N0pe." // +++ STOP +++
	
	if (la == "unknown")
	{
		parseNextWord()
		error(invalidParameterForPrint, true) // +++ STOP +++
	}
	// immediate values
	else if (la == "number")
	{
		output += parseNextNumber()
	}
	else if (la == "string")
	{
		output += parseNextString()
		if (stop) return "N0pe." // +++ STOP +++
	}
	// already defined values
	else if (la == "defined")
	{
		parseNextWord() // read next word
		if (variableArray[variableLastLookup].isBuiltIn == builtIn)
		{
			value = variableArray[variableLastLookup].value()
			output += value
			// bloody hell
		}
		else // user
		{
			output += variableArray[variableLastLookup].value
		}
	}
	return "N0pe."
}

//==============================================================================

function subPrintln()
{
	subPrint()
	output += "\n"
	return "N0pe."
}

//==============================================================================

function subRun()
{
	currentSubroutine = "subRun()"

	var la
	var subroutine
	var i
	var _argumentCount
	
	la = lookAhead()
	if (stop) return "N0pe." // +++ STOP +++
	
	if (la == "defined")
	{
		parseNextWord()
		if (variableArray[variableLastLookup].isBuiltIn == builtIn)
		{
			error(invalidParameterForRun, true) // +++ STOP +++
			return "N0pe."
		}
		subroutine = variableArray[variableLastLookup].value
		if ( _isNaN(subroutine) ) // string
		{
			for (i=0; i < variableArray[variableLastLookup].argumentCount; i++)
			{
				programQueue.push( parseNextArgument() )
				if (stop) return "N0pe." // +++ STOP +++
			}
			evalSubroutine(subroutine)
		}
		else
		{
			error(invalidParameterForRun, true) // +++ STOP +++
			return "N0pe."
		}
	}
	else if (la == "string")
	{
		subroutine = parseNextString()
		if (stop) return "N0pe." // +++ STOP +++
		_argumentCount = paramCount(subroutine)
		for (i=0; i < _argumentCount; i++)
		{
			programQueue.push( parseNextArgument() )
			if (stop) return "N0pe." // +++ STOP +++
		}
		evalSubroutine(subroutine)
	}
	else
	{
		parseNextWord()
		error(invalidParameterForRun, true) // +++ STOP +++
	}

	return lastReturnValue
}

//==============================================================================

function subGet()
{
	currentSubroutine = "subGet()"

	var _name
	var _value
	
	_name = parseNextWord()
	if (stop) return "N0pe." // +++ STOP +++

	if (programQueue.length == 0) // +++ STOP +++ on empty queue
	{
		error(programQueueIsEmpty, true)
		return "N0pe."
	}
	_value = programQueue.shift()
	newVariable(_name, 0, user, _value)
	
	lastReturnValue = _value // +++ lastReturnValue +++
	return "N0pe."
}

//==============================================================================

function subDebug()
{
	if (debug) debug = false
	else debug = true
	return "N0pe."
}

//==============================================================================

function subVar()
{
	currentSubroutine = "subVar()"

	var _name
	var _value
	
	_name = parseNextWord()
	if (stop) return "N0pe." // +++ STOP +++

	if (variableIsDefined(_name))
	{
		if (variableArray[variableLastLookup].isBuiltIn == builtIn)
		{
			_value = "N0pe."
		}
		else
		{
			_value = variableArray[variableLastLookup].value
		}
	}
	else _value = "N0pe."
	
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subExit()
{
	stop = true
	return "N0pe."
}

//==============================================================================

function subError()
{
	currentSubroutine = "subError()"

	var str
	
	str = parseNextString()
	if (stop) return "N0pe." // +++ STOP +++
	
	window.alert(str)
	stop = true
	return "N0pe."
}

//==============================================================================

// loop arg1 arg2
// arg1: *must be* a numeric variable
// arg2: *must be* a string value (predefined or immediate)
function subLoop()
{
	currentSubroutine = "subLoop()"

	var iterator
	var iteratorPtr
	var la
	var block
	var stop3
	
	iterator = parseNextWord()
	if (stop) return "N0pe." // +++ STOP +++
	
	if (variableIsDefined(iterator))
	{
		if (variableArray[variableLastLookup].isBuiltIn == builtIn)
		{
			error(invalidIteratorVariableForLoop, true)
			return "N0pe."
		}
		else
		{
			if ( _isNaN(variableArray[variableLastLookup].value) )
			{
				error(invalidIteratorVariableForLoop, true)
				return "N0pe."
			}
			else // number
			{
				// iterator ok
				iteratorPtr = variableLastLookup
			
				la = lookAhead()
				if (stop) return "N0pe."
				
				if (la == "defined")
				{
					parseNextWord()
					if (variableArray[variableLastLookup].isBuiltIn == builtIn)
					{
						error(invalidBlockArgumentForLoop, true)
						return "N0pe."
					}
					else // user
					{
						if ( _isNaN(variableArray[variableLastLookup].value) )
						{
							block = variableArray[variableLastLookup].value
						}
						else // number
						{
							error(invalidBlockArgumentForLoop, true)
							return "N0pe."
						}
					}
				}
				else if (la == "string")
				{
					block = parseNextString()
					if (stop) return "N0pe."
				}
				else
				{
					parseNextWord()
					error(invalidBlockArgumentForLoop, true)
					return "N0pe."
				}

				// block ok
				
				// ----------------------------------------------------------------
				
				workStack.push(wordArray)
				workStack.push(wordCount)
				workStack.push(wordCurrent)
				wordArray = block.split(wsre)
				wordCount = wordArray.length
				if (wordArray[0] == "") wordCount = 0
				wordCurrent = 0
				loopLevel++
			
				stop3 = false
			
				while (!stop3)
				{
					currentSubroutine = "subLoop()"
					
					// check iterator
					if ( _isNaN(variableArray[iteratorPtr].value) )
					{
						error(iteratorTypeMustNotBeChanged, true)
						break
					}
					else // iterator ok
					{
						if ( variableArray[iteratorPtr].value == 0 )
						{
							stop3 = true
						}
						else // iterator != 0
						{
							if (wordCurrent >= wordCount)
							{
								wordCurrent = 0 // loop
							}
							else
							{
								if (variableIsDefined(parseNextWord()))
								{
									if ( variableArray[variableLastLookup].isBuiltIn == user )
									{
										error(builtInSubroutineCallRequired, true)
										break
									}
									variableArray[variableLastLookup].value()
								}
								else
								{
									if (wordArray[wordCurrent-1] == "") stop3 = true // Firefox bugfix
									else error(invalidSubroutineReference, true)
								}
							}
						}
					}

					if (stop) stop3 = true
				}
					
				loopLevel--
				wordCurrent = workStack.pop()
				wordCount = workStack.pop()
				wordArray = workStack.pop()
			}
		}
	}
	else
	{
		error(invalidIteratorVariableForLoop, true)
	}

	return "N0pe."
}

//==============================================================================

// auto-convert
function subInc()
{
	currentSubroutine = "subInc()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	lastReturnValue = _value + 1 // +++ lastReturnValue +++
	return (_value + 1)
}

//==============================================================================

// auto-convert
function subDec()
{
	currentSubroutine = "subDec()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	lastReturnValue = _value - 1 // +++ lastReturnValue +++
	return (_value - 1)
}

//==============================================================================

function evalBranch()
{
	var la
	var _value
	
	la = lookAhead()
	if (stop) return "N0pe."
	
	switch (la)
	{
		case "defined":
			parseNextWord()
			_value = variableArray[variableLastLookup].value
			if ( _isNaN(_value) )
			{
				evalSubroutine(_value)
			}
			else
			{
				error(invalidBlockArgumentForIf, true)
			}
			break;
		case "string":
			_value = parseNextString()
			if (stop) return "N0pe."
			evalSubroutine(_value)
			break;
		case "number":
		case "unknown":
			error(invalidBlockArgumentForIf, true)
	}
	return "N0pe."
}

function subIf()
{
	currentSubroutine = "subIf()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	if (_value) // true
	{
		evalBranch()
		if (stop) return "N0pe."
		parseNextArgument()
	}
	else // false
	{
		parseNextArgument()
		evalBranch()
	}
	return "N0pe."
}

//==============================================================================

function subEq()
{
	currentSubroutine = "subEq()"

	var arg1
	var arg2
	var _value
	
	arg1 = parseNextArgument()
	if (stop) return "N0pe."
	arg2 = parseNextArgument()
	if (stop) return "N0pe."

	if ( areNumbers(arg1, arg2) )
	{
		arg1 = toNumber(arg1)
		arg2 = toNumber(arg2)
		
		if (arg1 == arg2) _value = 1
		else _value = 0
	}
	else // string comparison
	{
		if (arg1 == arg2) _value = 1
		else _value = 0
	}
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subGt()
{
	currentSubroutine = "subGt()"

	var arg1
	var arg2
	
	arg1 = parseNextArgument()
	if (stop) return "N0pe."
	arg2 = parseNextArgument()
	if (stop) return "N0pe."

	if ( areNumbers(arg1, arg2) )
	{
		arg1 = toNumber(arg1)
		arg2 = toNumber(arg2)
		
		if (arg1 > arg2) _value = 1
		else _value = 0
	}
	else // string comparison
	{
		if (arg1 > arg2) _value = 1
		else _value = 0
	}
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subGteq()
{
	currentSubroutine = "subGteq()"

	var arg1
	var arg2
	
	arg1 = parseNextArgument()
	if (stop) return "N0pe."
	arg2 = parseNextArgument()
	if (stop) return "N0pe."

	if ( areNumbers(arg1, arg2) )
	{
		arg1 = toNumber(arg1)
		arg2 = toNumber(arg2)
		
		if (arg1 >= arg2) _value = 1
		else _value = 0
	}
	else // string comparison
	{
		if (arg1 >= arg2) _value = 1
		else _value = 0
	}
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subAnd()
{
	currentSubroutine = "subAnd()"

	var _value
	var _value2
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	_value2 = readNextNumber()
	if (stop) return "N0pe."

	if (_value && _value2)
	{
		lastReturnValue = 1 // +++ lastReturnValue +++
		return 1
	}
	else
	{
		lastReturnValue = 0 // +++ lastReturnValue +++
		return 0
	}
}

//==============================================================================

function subOr()
{
	currentSubroutine = "subOr()"

	var _value
	var _value2
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	_value2 = readNextNumber()
	if (stop) return "N0pe."

	if (_value || _value2)
	{
		lastReturnValue = 1 // +++ lastReturnValue +++
		return 1
	}
	else
	{
		lastReturnValue = 0 // +++ lastReturnValue +++
		return 0
	}
}

//==============================================================================

function subNot()
{
	currentSubroutine = "subNot()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	if (_value)
	{
		lastReturnValue = 0 // +++ lastReturnValue +++
		return 0
	}
	else
	{
		lastReturnValue = 1 // +++ lastReturnValue +++
		return 1
	}
}

//==============================================================================

function subAdd()
{
	currentSubroutine = "subAdd()"

	var _value
	var _value2
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	_value2 = readNextNumber()
	if (stop) return "N0pe."

	_value += _value2
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subSub()
{
	currentSubroutine = "subSub()"

	var _value
	var _value2
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	_value2 = readNextNumber()
	if (stop) return "N0pe."

	_value -= _value2
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subMul()
{
	currentSubroutine = "subMul()"

	var _value
	var _value2
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	_value2 = readNextNumber()
	if (stop) return "N0pe."

	_value *= _value2
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subDiv()
{
	currentSubroutine = "subDiv()"

	var _value
	var _value2
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	_value2 = readNextNumber()
	if (stop) return "N0pe."

	if (_value2 == 0)
	{
		error(divisionByZero, true)
		return "N0pe."
	}
	_value /= _value2
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subMod()
{
	currentSubroutine = "subMod()"

	var _value
	var _value2
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	_value2 = readNextNumber()
	if (stop) return "N0pe."

	if (_value2 == 0)
	{
		error(divisionByZero, true)
		return "N0pe."
	}
	_value %= _value2
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subPow()
{
	currentSubroutine = "subPow()"

	var _value
	var _value2
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	_value2 = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.pow(_value, _value2)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subSin()
{
	currentSubroutine = "subSin()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.sin(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subCos()
{
	currentSubroutine = "subCos()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.cos(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subTan()
{
	currentSubroutine = "subTan()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.tan(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subAsin()
{
	currentSubroutine = "subAsin()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.asin(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subAcos()
{
	currentSubroutine = "subAcos()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.acos(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subAtan()
{
	currentSubroutine = "subAtan()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.atan(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subLn()
{
	currentSubroutine = "subLn()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.log(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subE()
{
	var _value
	
	_value = Math.E
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subPi()
{
	var _value

	_value = Math.PI
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subAbs()
{
	currentSubroutine = "subAbs()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.abs(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subCeil()
{
	currentSubroutine = "subCeil()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.ceil(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subFloor()
{
	currentSubroutine = "subFloor()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.floor(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subRound()
{
	currentSubroutine = "subRound()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."

	_value = Math.round(_value)
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subRand()
{
	currentSubroutine = "subRand()"

	var _value
	var _value2
	var range
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	_value2 = readNextNumber()
	if (stop) return "N0pe."

	range = _value2 - _value
	
	_value = Math.random() * range + _value
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subTop()
{
	var _value

	_value = programStack.length-1
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subPush()
{
	currentSubroutine = "subPush()"

	var _value
	
	_value = parseNextArgument()
	if (stop) return "N0pe."
	programStack.push(_value)
	return "N0pe."
}

//==============================================================================

function subPop()
{
	currentSubroutine = "subPop()"

	var _value
	
	if (subTop() < 0)
	{
		error(stackUnderflow, true)
		return "N0pe."
	}
	else
	{
		_value = programStack.pop()
		lastReturnValue = _value // +++ lastReturnValue +++
		return _value
	}
}

//==============================================================================

function subLift()
{
	currentSubroutine = "subLift()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	
	if ((_value < 0) || (_value > subTop()))
	{
		error(invalidStackReference, true)
		return "N0pe."
	}

	workStack.push( programStack[_value] )
	programStack.splice(_value, 1)
	programStack.push( workStack.pop() )
	return "N0pe."
}

//==============================================================================

function subDrop()
{
	currentSubroutine = "subDrop()"

	var _value
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	
	if ((_value < 0) || (_value > subTop()))
	{
		error(invalidStackReference, true)
		return "N0pe."
	}

	workStack.push( programStack.pop() )
	programStack.splice(_value, 0, workStack.pop())
	return "N0pe."
}

//==============================================================================

function subPeek()
{
	currentSubroutine = "subPeek()"

	var _value
	var temp
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	
	if ((_value < 0) || (_value > subTop()))
	{
		error(invalidStackReference, true)
		return "N0pe."
	}

	temp = programStack[_value]
	lastReturnValue = temp // +++ lastReturnValue +++
	return temp
}

//==============================================================================

function subPoke()
{
	currentSubroutine = "subPoke()"

	var _value
	var _value2
	
	_value = readNextNumber()
	if (stop) return "N0pe."
	_value2 = parseNextArgument()
	if (stop) return "N0pe."
	
	if ((_value < 0) || (_value > subTop()))
	{
		error(invalidStackReference, true)
		return "N0pe."
	}

	programStack[_value] = _value2
	return "N0pe."
}

//==============================================================================

function subToStack()
{
	currentSubroutine = "subToStack()"

	var _value
	var _wordArray
	var _wordCount
	var i
	
	_value = readNextString()
	if (stop) return "N0pe."

	_wordArray = _value.split(wsre)
	_wordCount = _wordArray.length
	
	for (i=0; i < _wordCount; i++)
	{
		programStack.push( _wordArray[i] )
	}

	return "N0pe."
}

//==============================================================================

function subToString()
{
	currentSubroutine = "subToString()"

	var _value
	var _str = []
	var i
	var top

	_value = readNextNumber()
	if (stop) return "N0pe."

	if ((_value < 0) || (_value > subTop()))
	{
		error(invalidStackReference, true)
		return "N0pe."
	}

	top = subTop()
	for (i=_value; i<=top; i++)
	{
		_str += programStack[i]
		if (i != top) _str += " "
	}

	for (i=_value; i<=top; i++) subPop()

	currentSubroutine = "subToString()"
	lastReturnValue = _str // +++ lastReturnValue +++
	return _str
}

//==============================================================================

function subMelt()
{
	currentSubroutine = "subMelt()"

	var _value
	var _len
	var i
	
	_value = readNextString()
	if (stop) return "N0pe."

	_len = _value.length
	for (i=0; i < _len; i++)
	{
		programStack.push( _value.charAt(i) )
	}

	return "N0pe."
}

//==============================================================================

function subMerge()
{
	currentSubroutine = "subMerge()"

	var _value
	var _str = []
	var i
	var top

	_value = readNextNumber()
	if (stop) return "N0pe."

	if ((_value < 0) || (_value > subTop()))
	{
		error(invalidStackReference, true)
		return "N0pe."
	}

	top = subTop()
	for (i=_value; i<=top; i++)
	{
		_str += programStack[i]
	}

	for (i=_value; i<=top; i++) subPop()

	currentSubroutine = "subMerge()"
	lastReturnValue = _str // +++ lastReturnValue +++
	return _str
}

//==============================================================================

function subWs()
{
	lastReturnValue = " " // +++ lastReturnValue +++
	return " "
}

//==============================================================================

function subTab()
{
	lastReturnValue = "\t" // +++ lastReturnValue +++
	return "\t"
}

//==============================================================================

function subDump()
{
	var dumpWindow
	var dumpDocument
	var i
	var type
	
	dumpWindow = window.open()
	dumpDocument = dumpWindow.document
	dumpDocument.writeln("<html><head><title>Dump</title></head><body><tt>")
	
	dumpDocument.writeln("<b>Stack:</b><br><br>")
	if (subTop() == -1) dumpDocument.writeln("- empty -<br>")
	for (i = subTop(); i >= 0; i--)
	{
		if ( _isNaN(programStack[i]) ) type = "s"
		else type = "n"
		dumpDocument.writeln( "["+ i + "][" + type + "] " + programStack[i] + "<br>" )
	}

	dumpDocument.writeln("<br><hr><br>(legend: n denotes numbers, s strings)</tt></body></html>")
	return "N0pe."
}

//==============================================================================

function subDate()
{
	var _value
	var mydate
	
	mydate = new Date()
	mydate.getTime()
	_value = mydate.toString()
	lastReturnValue = _value // +++ lastReturnValue +++
	return _value
}

//==============================================================================

function subInput()
{
	currentSubroutine = "subInput()"

	var _value
	var _ret

	_value = parseNextArgument()
	if (stop) return "N0pe."

	_ret = window.prompt("", _value)
	if (_ret == null) _ret = "N0pe."
	lastReturnValue = _ret // +++ lastReturnValue +++
	return _ret
}

//==============================================================================
// Interpreter core
//==============================================================================

function evalWebtongue(code)
{
	var _wordArray

	// --- Initialize ---
	
	initGlobals()
	_wordArray = code.split(wsre)
	wordArray = stripComments(_wordArray)
	if (stop) return output // +++ STOP +++
	initMezzanineFunctions()
	wordCount = wordArray.length
	wordCurrent = 0
	
	// Built-in subroutines

	// all names must be lowercase here (!)
	variableArray.push(new variable("let", 2, builtIn, subLet))
	variableArray.push(new variable("print", 1, builtIn, subPrint))
	variableArray.push(new variable("println", 1, builtIn, subPrintln))
	variableArray.push(new variable("run", 1, builtIn, subRun))
	variableArray.push(new variable("get", 1, builtIn, subGet))
	variableArray.push(new variable("debug", 0, builtIn, subDebug))
	variableArray.push(new variable("var", 1, builtIn, subVar))
	variableArray.push(new variable("exit", 0, builtIn, subExit))
	variableArray.push(new variable("error", 1, builtIn, subError))
	variableArray.push(new variable("loop", 2, builtIn, subLoop))
	variableArray.push(new variable("inc", 1, builtIn, subInc))
	variableArray.push(new variable("dec", 1, builtIn, subDec))
	variableArray.push(new variable("if", 3, builtIn, subIf))
	variableArray.push(new variable("eq", 2, builtIn, subEq))
	variableArray.push(new variable("gt", 2, builtIn, subGt))
	variableArray.push(new variable("gteq", 2, builtIn, subGteq))
	variableArray.push(new variable("and", 2, builtIn, subAnd))
	variableArray.push(new variable("or", 2, builtIn, subOr))
	variableArray.push(new variable("not", 1, builtIn, subNot))
	variableArray.push(new variable("add", 2, builtIn, subAdd))
	variableArray.push(new variable("sub", 2, builtIn, subSub))
	variableArray.push(new variable("mul", 2, builtIn, subMul))
	variableArray.push(new variable("div", 2, builtIn, subDiv))
	variableArray.push(new variable("mod", 2, builtIn, subMod))
	variableArray.push(new variable("pow", 2, builtIn, subPow))
	variableArray.push(new variable("sin", 1, builtIn, subSin))
	variableArray.push(new variable("cos", 1, builtIn, subCos))
	variableArray.push(new variable("tan", 1, builtIn, subTan))
	variableArray.push(new variable("asin", 1, builtIn, subAsin))
	variableArray.push(new variable("acos", 1, builtIn, subAcos))
	variableArray.push(new variable("atan", 1, builtIn, subAtan))
	variableArray.push(new variable("ln", 1, builtIn, subLn))
	variableArray.push(new variable("e", 0, builtIn, subE))
	variableArray.push(new variable("pi", 0, builtIn, subPi))
	variableArray.push(new variable("abs", 1, builtIn, subAbs))
	variableArray.push(new variable("ceil", 1, builtIn, subCeil))
	variableArray.push(new variable("floor", 1, builtIn, subFloor))
	variableArray.push(new variable("round", 1, builtIn, subRound))
	variableArray.push(new variable("rand", 2, builtIn, subRand))
	variableArray.push(new variable("top", 0, builtIn, subTop))
	variableArray.push(new variable("push", 1, builtIn, subPush))
	variableArray.push(new variable("pop", 0, builtIn, subPop))
	variableArray.push(new variable("lift", 1, builtIn, subLift))
	variableArray.push(new variable("drop", 1, builtIn, subDrop))
	variableArray.push(new variable("peek", 1, builtIn, subPeek))
	variableArray.push(new variable("poke", 2, builtIn, subPoke))
	variableArray.push(new variable("tostack", 1, builtIn, subToStack))
	variableArray.push(new variable("tostring", 1, builtIn, subToString))
	variableArray.push(new variable("melt", 1, builtIn, subMelt))
	variableArray.push(new variable("merge", 1, builtIn, subMerge))
	variableArray.push(new variable("ws", 0, builtIn, subWs))
	variableArray.push(new variable("tab", 0, builtIn, subTab))
	variableArray.push(new variable("dump", 0, builtIn, subDump))
	variableArray.push(new variable("date", 0, builtIn, subDate))
	variableArray.push(new variable("input", 1, builtIn, subInput))
	variableCount = variableArray.length

	// --- Evaluate ---

	while (!stop)
	{
		currentSubroutine = "main loop"

		if (wordCurrent >= wordCount)
		{
			stop = true
		}
		else
		{
			if ( variableIsDefined(parseNextWord()) )
			{
				if ( variableArray[variableLastLookup].isBuiltIn == user )
				{
					error(builtInSubroutineCallRequired, true)
					break
				}
				variableArray[variableLastLookup].value()
			}
			else
			{
				if (wordArray[wordCurrent-1] == "") stop = true // Firefox bugfix
				else error(invalidSubroutineReference, true)
			}
		}
	}

	return output
}

//==============================================================================
// HTML-embedded functions
//==============================================================================

function startup()
{
	document.Workspace.Code.focus()
}

// clear text boxes
function handleNew()
{
	document.Workspace.Code.value = ""
	document.Workspace.Output.value = ""
	startup()
	return false
}

// interpret code given in the Code box
function handleExecute()
{
	document.Workspace.Output.value = evalWebtongue(document.Workspace.Code.value)
	
	document.Workspace.Code.focus()
	return false
}
