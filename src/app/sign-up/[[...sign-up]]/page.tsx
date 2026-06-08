import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-valo-darker flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1 mb-2">
            <span className="text-valo-red font-black text-2xl tracking-tight">VALO</span>
            <span className="text-white font-bold text-2xl tracking-tight">TOURNEYS</span>
          </div>
          <p className="text-valo-text text-sm">Crea tu cuenta gratis</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-valo-card border border-valo-border shadow-none rounded-lg',
              headerTitle: 'text-white',
              headerSubtitle: 'text-valo-text',
              socialButtonsBlockButton: 'bg-valo-darker border-valo-border text-white hover:bg-valo-border',
              dividerLine: 'bg-valo-border',
              dividerText: 'text-valo-text',
              formFieldLabel: 'text-valo-text',
              formFieldInput: 'bg-valo-darker border-valo-border text-white',
              formButtonPrimary: 'bg-valo-red hover:bg-valo-red/90',
              footerActionLink: 'text-valo-red hover:text-valo-red/80',
            },
          }}
        />
      </div>
    </div>
  )
}
