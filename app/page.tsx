import Image from "next/image";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <nav className="flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="Kitabça Sistemi"
            className="h-8 w-auto"
          />
          <h1 className="text-xl font-bold text-foreground">Kitabça Sistemi</h1>
        </div>
        <Button variant="outline" className="hidden md:block">
          Panel Girişi
        </Button>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-4">
        <Card className="w-full max-w-xl mx-auto p-8 md:p-10">
          <CardHeader>
            <CardTitle>3 addımda imtahana giriş</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Sadece hazırda açığı olan imtahanlar sizə göstərilir
            </p>

            <div className="space-y-4">
              {/* Step 1: Select exam */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  İmtahanı seçin
                </label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md focus-ring-2 focus-ring-ring focus-ring-offset-2 focus-border-transparent"
                >
                  <option>Yalnız hazırda açık olan imtahanlar göstərilir</option>
                </select>
              </div>

              {/* Step 2: FIN code */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  FİN kodunuzu yazın
                </label>
                <Input
                  placeholder="Şəxsiyyət vəsiqənizdəki 7 simvol"
                  className="w-full px-3 py-2 border border-border rounded-md focus-ring-2 focus-ring-ring focus-ring-offset-2 focus-border-transparent"
                />
              </div>

              {/* Step 3: Ticket code */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bilet kodunu daxil edin
                </label>
                <Input
                  placeholder="Biletdəki XXXX-XXXX kodu"
                  className="w-full px-3 py-2 border border-border rounded-md focus-ring-2 focus-ring-ring focus-ring-offset-2 focus-border-transparent"
                />
              </div>
            </div>

            <Button
              onClick={() => window.location.href="/online-exam"}
              className="w-full mt-6 py-3 px-4 font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              İmtahana daxil ol
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}