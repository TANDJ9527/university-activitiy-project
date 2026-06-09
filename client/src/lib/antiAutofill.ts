import type { InputHTMLAttributes } from 'react'

/** 阻止浏览器自动填充，每次进入页面输入框保持空白 */
export const antiAutofillInputProps: Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'autoComplete' | 'readOnly' | 'onFocus'
> = {
  autoComplete: 'off',
  readOnly: true,
  onFocus: (e) => {
    e.currentTarget.readOnly = false
  },
}
