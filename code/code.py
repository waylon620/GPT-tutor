# version: Python3

# code start

def count_vowels(input_string):
    vowels = ['a', 'e', 'i', 'o', 'u']
    count = 0
    
    # Iterate over each character in the input string
    for char in input_string:
        if char.lower() in vowels:
            count += 1
    
    return count

# Prompt the user to enter a string
user_input = input("Enter a string: ")

# Call the count_vowels function with the user input
vowel_count = count_vowels(user_input)

# Print the count of vowels in the string
print("Number of vowels:", vowel_count)