import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Wifi, Shield, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MikrotikRouter, InsertMikrotikRouter } from "@shared/schema";

interface RouterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  router?: MikrotikRouter | null;
  mode: "create" | "edit";
}

export default function RouterDialog({ isOpen, onClose, router, mode }: RouterDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    host: "",
    port: "8728",
    username: "",
    password: "",
    routerosVersion: "7.x",
    connectionType: "direct",
    isActive: true,
  });
  
  const [ovpnConfig, setOvpnConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("basic");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (router && mode === "edit") {
      setFormData({
        name: router.name,
        host: router.host,
        port: router.port.toString(),
        username: router.username,
        password: router.password,
        routerosVersion: router.routerosVersion || "7.x",
        connectionType: router.connectionType || "direct",
        isActive: router.isActive,
      });
      
      // Load existing OpenVPN configuration if router has one
      if (router.connectionType === "ovpn_client" && router.ovpnServerHost) {
        setOvpnConfig({
          serverHost: router.ovpnServerHost,
          serverPort: router.ovpnServerPort,
          username: router.ovpnUsername,
          password: router.ovpnPassword,
          tunnelIp: router.ovpnTunnelIp,
          clientCertificate: router.ovpnCertificate,
          clientPrivateKey: router.ovpnPrivateKey,
          caCertificate: router.ovpnCaFile,
          routerName: router.name,
          mikrotikScript: "", // Will be regenerated if needed
          setupGuide: "", // Will be regenerated if needed
        });
      } else {
        setOvpnConfig(null);
      }
    } else if (mode === "create") {
      setFormData({
        name: "",
        host: "",
        port: "8728",
        username: "",
        password: "",
        routerosVersion: "7.x",
        connectionType: "direct",
        isActive: true,
      });
      setOvpnConfig(null);
    }
  }, [router, mode, isOpen]);

  const generateOvpnConfigMutation = useMutation({
    mutationFn: async (data: { routerName: string; routerosVersion: string }) => {
      const response = await apiRequest("POST", "/api/admin/routers/generate-ovpn", data);
      return response.json();
    },
    onSuccess: (data) => {
      setOvpnConfig(data);
      setActiveTab("ovpn");
      toast({
        title: "OpenVPN Configuration Generated",
        description: "Your OpenVPN configuration is ready for setup.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate OpenVPN configuration",
        variant: "destructive",
      });
    },
  });

  const regenerateScriptMutation = useMutation({
    mutationFn: async () => {
      if (!ovpnConfig) throw new Error("No OpenVPN configuration available");
      const response = await apiRequest("POST", "/api/admin/routers/regenerate-script", { 
        config: ovpnConfig,
        routerosVersion: formData.routerosVersion,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setOvpnConfig((prev: any) => ({
        ...prev!,
        mikrotikScript: data.mikrotikScript,
        setupGuide: data.setupGuide,
      }));
      toast({
        title: "Script Regenerated",
        description: "Configuration script has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate script",
        variant: "destructive",
      });
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = mode === "create" ? "/api/admin/routers" : `/api/admin/routers/${router?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      
      // Include OpenVPN configuration if present
      const routerData = {
        ...data,
        ...(ovpnConfig && {
          ovpnServerHost: ovpnConfig.serverHost,
          ovpnServerPort: ovpnConfig.serverPort,
          ovpnUsername: ovpnConfig.username,
          ovpnPassword: ovpnConfig.password,
          ovpnTunnelIp: ovpnConfig.tunnelIp,
          ovpnCertificate: ovpnConfig.clientCertificate,
          ovpnPrivateKey: ovpnConfig.clientPrivateKey,
          ovpnCaFile: ovpnConfig.caCertificate,
        }),
      };
      
      const response = await apiRequest(method, url, routerData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: mode === "create" ? "Router Added" : "Router Updated",
        description: `Successfully ${mode === "create" ? "added" : "updated"} the MikroTik router.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/routers'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode} router`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.host.trim() || !formData.username.trim() || !formData.password.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const port = parseInt(formData.port);
    if (isNaN(port) || port <= 0 || port > 65535) {
      toast({
        title: "Invalid Port",
        description: "Please enter a valid port number (1-65535)",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      name: formData.name.trim(),
      host: formData.host.trim(),
      port,
      username: formData.username.trim(),
      password: formData.password,
      routerosVersion: formData.routerosVersion,
      connectionType: formData.connectionType,
      isActive: formData.isActive,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "File Downloaded",
      description: `${filename} has been downloaded`,
    });
  };

  const handleGenerateOvpnConfig = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Missing Router Name",
        description: "Please enter a router name first",
        variant: "destructive",
      });
      return;
    }
    generateOvpnConfigMutation.mutate({
      routerName: formData.name.trim(),
      routerosVersion: formData.routerosVersion,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New MikroTik Router" : "Edit Router"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Basic Setup
            </TabsTrigger>
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Connection Type
            </TabsTrigger>
            <TabsTrigger 
              value="ovpn" 
              className="flex items-center gap-2" 
              disabled={formData.connectionType !== "ovpn_client"}
            >
              <Shield className="w-4 h-4" />
              OpenVPN Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="router-name">Router Name</Label>
                <Input
                  id="router-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Router - Location"
                  data-testid="input-router-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="router-username">RouterOS Username</Label>
                  <Input
                    id="router-username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="admin"
                    data-testid="input-router-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="router-password">RouterOS Password</Label>
                  <Input
                    id="router-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter RouterOS password"
                    data-testid="input-router-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="routeros-version">RouterOS Version</Label>
                <Select 
                  value={formData.routerosVersion} 
                  onValueChange={(value) => setFormData({ ...formData, routerosVersion: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select RouterOS version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7.x">RouterOS 7.x (Recommended)</SelectItem>
                    <SelectItem value="6.x">RouterOS 6.x (Legacy)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  Select your router's RouterOS version for compatible OpenVPN configuration.
                  Check in RouterOS: System → Resources
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="router-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-router-active"
                />
                <Label htmlFor="router-active">Router Active</Label>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="connection" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="connection-type">Connection Method</Label>
                <Select 
                  value={formData.connectionType} 
                  onValueChange={(value) => setFormData({ ...formData, connectionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct Connection (Same Network)</SelectItem>
                    <SelectItem value="ovpn_client">OpenVPN Client (Remote/Secure)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.connectionType === "direct" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      Direct Connection Setup
                    </CardTitle>
                    <CardDescription>
                      Connect to router directly via IP address (same network)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="router-host">Router IP Address</Label>
                        <Input
                          id="router-host"
                          value={formData.host}
                          onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                          placeholder="192.168.1.1"
                          data-testid="input-router-host"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="router-port">API Port</Label>
                        <Input
                          id="router-port"
                          type="number"
                          value={formData.port}
                          onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                          placeholder="8728"
                          min="1"
                          max="65535"
                          data-testid="input-router-port"
                        />
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Requirements:</strong> Router must be accessible on the same network as this application.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {formData.connectionType === "ovpn_client" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      OpenVPN Client Setup
                    </CardTitle>
                    <CardDescription>
                      Secure remote connection via OpenVPN tunnel
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!ovpnConfig ? (
                      <div className="text-center space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-medium text-green-800 mb-2">Benefits of OpenVPN Connection:</h4>
                          <ul className="text-sm text-green-700 space-y-1 text-left">
                            <li>• Secure encrypted connection</li>
                            <li>• Works from anywhere with internet</li>
                            <li>• No need for port forwarding</li>
                            <li>• Automatic reconnection</li>
                            <li>• Multiple routers through single tunnel</li>
                          </ul>
                        </div>
                        <Button 
                          onClick={handleGenerateOvpnConfig}
                          disabled={generateOvpnConfigMutation.isPending}
                          className="w-full"
                        >
                          {generateOvpnConfigMutation.isPending ? "Generating..." : "Generate OpenVPN Configuration"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            OpenVPN Ready
                          </Badge>
                          <Badge variant="outline">
                            VPN IP: {ovpnConfig.tunnelIp}
                          </Badge>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <p className="text-sm text-yellow-700">
                            Configuration generated! Switch to the "OpenVPN Config" tab to get setup instructions.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ovpn" className="space-y-4">
            {ovpnConfig ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">OpenVPN Configuration Details</CardTitle>
                    <CardDescription>
                      Use these details to configure your MikroTik router
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label>VPN Server</Label>
                        <p className="font-mono">{ovpnConfig.serverHost}:{ovpnConfig.serverPort}</p>
                      </div>
                      <div>
                        <Label>Your VPN IP</Label>
                        <p className="font-mono">{ovpnConfig.tunnelIp}</p>
                      </div>
                      <div>
                        <Label>VPN Username</Label>
                        <p className="font-mono">{ovpnConfig.username}</p>
                      </div>
                      <div>
                        <Label>Router Name</Label>
                        <p className="font-mono">{ovpnConfig.routerName}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Certificate Files Download Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Certificate Files (Alternative Method)</CardTitle>
                    <CardDescription>
                      Download certificate files if the script method fails
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                      <p className="text-sm text-amber-700">
                        <strong>Note:</strong> Use this method if you get certificate import errors with the script above.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(ovpnConfig.caCertificate, `ca-cert-${ovpnConfig.routerName}.crt`)}
                        className="justify-start"
                        data-testid="button-download-ca-cert"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        CA Certificate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(ovpnConfig.clientCertificate, `client-cert-${ovpnConfig.routerName}.crt`)}
                        className="justify-start"
                        data-testid="button-download-client-cert"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Client Certificate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(ovpnConfig.clientPrivateKey, `client-key-${ovpnConfig.routerName}.key`)}
                        className="justify-start"
                        data-testid="button-download-private-key"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Private Key
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(
                          `# OpenVPN Client Config for ${ovpnConfig.routerName}\nclient\ndev tun\nproto udp\nremote ${ovpnConfig.serverHost} ${ovpnConfig.serverPort}\nresolv-retry infinite\nnobind\npersist-key\npersist-tun\ncipher AES-256-CBC\nauth SHA256\ncomp-lzo\nverb 3\n\n<ca>\n${ovpnConfig.caCertificate}\n</ca>\n\n<cert>\n${ovpnConfig.clientCertificate}\n</cert>\n\n<key>\n${ovpnConfig.clientPrivateKey}\n</key>`,
                          `${ovpnConfig.routerName}.ovpn`
                        )}
                        className="justify-start"
                        data-testid="button-download-ovpn-file"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        .ovpn File
                      </Button>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Manual Import Steps:</strong></p>
                      <p>1. Upload downloaded files to your MikroTik via Winbox → Files</p>
                      <p>2. In Terminal: <code>/certificate import file-name=ca-cert-{ovpnConfig.routerName}.crt</code></p>
                      <p>3. Import client cert: <code>/certificate import file-name=client-cert-{ovpnConfig.routerName}.crt private-key-file=client-key-{ovpnConfig.routerName}.key</code></p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      MikroTik Configuration Script
                      <div className="flex gap-2">
                        {(!ovpnConfig.mikrotikScript || ovpnConfig.mikrotikScript === "") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => regenerateScriptMutation.mutate()}
                            disabled={regenerateScriptMutation.isPending}
                            data-testid="button-generate-script"
                          >
                            {regenerateScriptMutation.isPending ? "Generating..." : "Generate Script"}
                          </Button>
                        )}
                        {ovpnConfig.mikrotikScript && ovpnConfig.mikrotikScript !== "" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => regenerateScriptMutation.mutate()}
                              disabled={regenerateScriptMutation.isPending}
                              data-testid="button-regenerate-script"
                            >
                              {regenerateScriptMutation.isPending ? "Regenerating..." : "Regenerate"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(ovpnConfig.mikrotikScript)}
                              data-testid="button-copy-script"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Script
                            </Button>
                          </>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ovpnConfig.mikrotikScript && ovpnConfig.mikrotikScript !== "" ? (
                      <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                        {ovpnConfig.mikrotikScript}
                      </pre>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                        <p>Click "Generate Script" to create the MikroTik configuration script</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      Setup Instructions
                      {ovpnConfig.setupGuide && ovpnConfig.setupGuide !== "" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(ovpnConfig.setupGuide)}
                          data-testid="button-copy-guide"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Guide
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ovpnConfig.setupGuide && ovpnConfig.setupGuide !== "" ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="text-xs whitespace-pre-wrap">{ovpnConfig.setupGuide}</pre>
                      </div>
                    ) : (
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5">1</Badge>
                          <div>
                            <p className="font-medium">Access your MikroTik router</p>
                            <p className="text-gray-600">Connect via Winbox, WebFig, or SSH terminal</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5">2</Badge>
                          <div>
                            <p className="font-medium">Open Terminal</p>
                            <p className="text-gray-600">Go to New Terminal in Winbox or use SSH</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5">3</Badge>
                          <div>
                            <p className="font-medium">Run Configuration Script</p>
                            <p className="text-gray-600">Copy and paste the script above into the terminal</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5">4</Badge>
                          <div>
                            <p className="font-medium">Verify Connection</p>
                            <p className="text-gray-600">Check that OpenVPN client shows "Connected" status</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5">5</Badge>
                          <div>
                            <p className="font-medium">Save Router</p>
                            <p className="text-gray-600">Click "Add Router" below to complete the setup</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">OpenVPN Configuration Required</CardTitle>
                  <CardDescription>
                    Generate OpenVPN configuration to enable secure remote access
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">
                      No OpenVPN configuration found. Generate one to enable secure remote connection.
                    </p>
                    <Button 
                      onClick={handleGenerateOvpnConfig}
                      disabled={generateOvpnConfigMutation.isPending || !formData.name.trim()}
                      className="w-full"
                      data-testid="button-generate-ovpn-config"
                    >
                      {generateOvpnConfigMutation.isPending ? "Generating..." : "Generate OpenVPN Configuration"}
                    </Button>
                    {!formData.name.trim() && (
                      <p className="text-sm text-red-500 mt-2">Please enter a router name first</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={mutation.isPending}
            data-testid="button-save-router"
          >
            {mutation.isPending ? "Saving..." : mode === "create" ? "Add Router" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}