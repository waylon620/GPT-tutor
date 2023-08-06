import js
from textwrap import dedent
import re
import math

def checkPrompt(msg):
    """Check each line of 'msg' for possible executable python code."""

    msgLists = msg.split('\n')
    isPython = 0

    # check each line for python code
    for x in msgLists:
        # remove indentation
        x = dedent(x)

        # make sure no 'inline' multiline code
        xList = x.split(';')
        for y in xList:
            y = dedent(y)
            if(not checkRegex(y)):
                try:
                    exec(x, {'__builtins__': math}, {'__builtins__': math})
                except NameError: 
                    if(len(x.split())>1):
                        isPython += 1
                except IndentationError:
                    if(((x[len(x)-1]==':' or x[len(x)-2]==':') and len(x.split())>1)
                    or len(x.split())>1):
                        isPython += 1
                except:
                    None
                else:
                    js.writeConsole("else__")
                    isPython += 1
                finally:
                    js.writeConsole(y + "y")
                    if(isPython > 0):
                        None
                        break
                    None
            else:
                isPython += 1

            if(isPython>0):
                js.writeConsole(y + "x")
                None
                break
            

    js.promptIsCode(isPython)
    return isPython

def checkRegex(val):
    """Check if argument 'val' contain possible import and/or file access for security reason."""

    # js.writeConsole("regex__ " + val)

    # import
    if (re.search("^(?:[ \n]*from[ ]+(\S+)[ ]+)?import[ ]+(\S+)(?:[ ]+as[ ]+(\S+))?[\n ]*$", val)):
        return True  
    # File access
    elif (re.search("^[ \n]*((\S+)[ ]+[=][ ]+)?(with[ ]+)?open[ ]*\([ ]*(\S+)[ ]*([,][ ]*(\S+)[ ]*)?\)[ \n]*", val)):
        return True  
    # built-in function
    elif (len(val.split())==1):
        for func_ in dir(__builtins__):
            if(re.search("^[ ]*" + func_ + "[ ]*", val)):
                return True 
    return False

# initialize pyScript
js.pyScriptLoaded()

