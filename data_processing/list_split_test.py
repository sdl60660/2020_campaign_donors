import numpy as np

def splitPerc(l, perc):
    # Turn percentages into values between 0 and 1
    splits = np.cumsum(perc)/100.

    if splits[-1] != 1:
        raise ValueError("percents don't add up to 100")

    # Split doesn't need last percent, it will just take what is left
    splits = splits[:-1]

    # Turn values into indices
    splits *= len(l)

    # Turn double indices into integers.
    # CAUTION: numpy rounds to closest EVEN number when a number is halfway
    # between two integers. So 0.5 will become 0 and 1.5 will become 2!
    # If you want to round up in all those cases, do
    # splits += 0.5 instead of round() before casting to int
    splits = splits.round().astype(np.int)

    return np.split(l, splits)

list = np.arange(20)
percents = np.array([25, 10, 15,  5,  5,  5, 10, 25])
# 100 elements -> lengths of sublists should equal their percents
print(splitPerc(list, percents))