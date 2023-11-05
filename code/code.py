# version: Python3

# code start

def is_palindrome(x):
    # Convert the integer to a string
    num_string = str(x)
    
    # Reverse the string and compare it to the original
    reversed_string = num_string[::-1]
    
    return num_string == reversed_string

# Call the function and print the result
print(is_palindrome("jij"))