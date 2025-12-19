import { useEffect, useState } from 'react'
import { ChevronDown, Users } from 'lucide-react'
import { api } from '../services/api'

interface Account {
  id: string
  name: string
  storedId?: string
}

interface AccountSelectorProps {
  selectedAccountId: string | null
  onAccountChange: (accountId: string | null) => void
  showAllOption?: boolean
}

const AccountSelector = ({ 
  selectedAccountId, 
  onAccountChange,
  showAllOption = true 
}: AccountSelectorProps) => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts')
      setAccounts(response.data)
      // Auto-select first account if none selected
      if (!selectedAccountId && response.data.length > 0 && showAllOption === false) {
        onAccountChange(response.data[0].id)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId)

  if (loading) {
    return (
      <div className="w-64 h-10 bg-gray-100 rounded-lg animate-pulse"></div>
    )
  }

  if (accounts.length === 0) {
    return null
  }

  return (
    <div className="relative w-full sm:w-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:min-w-[200px] text-sm"
      >
        <Users size={18} className="text-gray-500" />
        <span className="flex-1 text-left text-sm font-medium text-gray-700">
          {selectedAccountId === null && showAllOption
            ? 'Tất cả tài khoản'
            : selectedAccount?.name || 'Chọn tài khoản'}
        </span>
        <ChevronDown size={18} className="text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {showAllOption && (
              <button
                onClick={() => {
                  onAccountChange(null)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                  selectedAccountId === null ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                }`}
              >
                Tất cả tài khoản
              </button>
            )}
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  onAccountChange(account.id)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                  selectedAccountId === account.id
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700'
                }`}
              >
                {account.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default AccountSelector

