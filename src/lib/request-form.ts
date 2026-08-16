const MAX_FORM_FIELDS = 100
const MAX_FORM_FIELD_LENGTH = 100_000
const MAX_FILE_NAME_LENGTH = 255
const UNSAFE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

export async function readValidatedFormData(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    throw new Error('Malformed form payload.')
  }

  let count = 0
  for (const [key, value] of form.entries()) {
    count += 1
    if (count > MAX_FORM_FIELDS || key.length > 100 || UNSAFE_CONTROL_CHARACTERS.test(key)) {
      throw new Error('Form contains invalid fields.')
    }
    if (typeof value === 'string') {
      if (value.length > MAX_FORM_FIELD_LENGTH || UNSAFE_CONTROL_CHARACTERS.test(value)) {
        throw new Error('Form field is invalid.')
      }
    } else if (
      value.name.length > MAX_FILE_NAME_LENGTH
      || value.name !== value.name.replace(/[\\/]/g, '')
      || UNSAFE_CONTROL_CHARACTERS.test(value.name)
    ) {
      throw new Error('File name is invalid.')
    }
  }
  return form
}
