# version: Python3

# code start

def calculate_sum(numbers):
    total = 0
    for num in numbers:
        total += num
    return total

# Test case
nums = [3,10]  # Insert your numbers here
result = calculate_sum(nums)
print("Sum:", result)