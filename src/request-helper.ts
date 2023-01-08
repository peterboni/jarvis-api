import isAlphanumeric from 'validator/lib/isAlphanumeric';

/*
 * ErrorMessage.
 */
export type ErrorMessage = {
    message: string;
};

/*
 * ValidateResponse.
 */
export type ValidateResponse = {
    valid: boolean;
    errorMessage?: string;
};

/*
 * Validate Alphanumeric value.
 */
export function validateAlphanumeric(key: string, required: boolean, value?: string): ValidateResponse {

    let validateResponse: ValidateResponse = {
        valid: false,
        errorMessage: undefined
    };
    console.debug(key + ':', value);
    
    if (required && !value) {
        validateResponse.errorMessage = key + ' is required.';
        console.error(validateAlphanumeric.name + ':', validateResponse.errorMessage);
    } else if (value && !isAlphanumeric(value)) {
        validateResponse.errorMessage = key + ' must be alphanumeric.';
        console.error(validateAlphanumeric.name + ':', validateResponse.errorMessage);
    } else {
        validateResponse.valid = true;
    }

    return validateResponse;
}
