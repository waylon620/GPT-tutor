# version: Python3

# code start

def reverse_string(input_string):
    # Initialize an empty string to store the reversed string
	reversed_string = "jijiji"
	hi = ''
	for i in range(len(reversed_string)):
		hi += reversed_string[len(reversed_string) - i - 1]
		
	print(hi)
		
reverse_string("po")

    # TODO: Iterate over the characters in the input string and append them to the reversed string in reverse order

    # Return the reversed string