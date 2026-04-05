import {
  User,
  Camera,
  X,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { isAddress } from "viem";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useUserProfile,
  useUpdateProfile,
  useLinkWallet,
} from "@/hooks/use-api-queries";
import { useUserInfo } from "@/hooks/use-user-info";
import { toast } from "sonner";

import { DatePickerField } from "./date-picker-field";
import { FormField } from "./form-field";
import { GENDER_OPTIONS } from "./profile-constants";

export function AccountSettingsForm({ onCancel }: { onCancel?: () => void }) {
  const userInfo = useUserInfo();
  const { data: profileData, isLoading } = useUserProfile();

  const updateProfileMutation = useUpdateProfile();
  const linkWalletMutation = useLinkWallet();

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const fileRef = useRef<HTMLInputElement>(null);

  // ===== DATA =====
  const displayEmail = useMemo(() => {
    if (profileData?.user?.email) return profileData.user.email;
    if (!userInfo.email) return "";
    if (isAddress(userInfo.email)) return "";
    return userInfo.email.includes("@") ? userInfo.email : "";
  }, [userInfo.email, profileData]);

  const initialProfile = useMemo(() => {
    const name = (profileData?.user?.name || userInfo.name || "").split(" ");
    return {
      firstName: name[0] || "",
      lastName: name.slice(1).join(" "),
      phone: "",
      gender: "male",
      dateOfBirth: "",
      bio: profileData?.user?.bio || "",
      avatar: profileData?.user?.avatar || userInfo.avatar || "",
    };
  }, [profileData, userInfo]);

  const [profile, setProfile] = useState(initialProfile);
  const [avatar, setAvatar] = useState<string | null>(
    initialProfile.avatar || null
  );

  useEffect(() => {
    setProfile(initialProfile);
    setAvatar(initialProfile.avatar || null);
  }, [initialProfile]);

  const updateField = (k: string, v: any) =>
    setProfile((p) => ({ ...p, [k]: v }));

  // ===== AVATAR =====
  const onAvatarChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/"))
      return toast.error("File must be image");

    if (file.size > 5 * 1024 * 1024)
      return toast.error("Max 5MB");

    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatar(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ===== SAVE =====
  const handleSave = async () => {
    try {
      const name = `${profile.firstName} ${profile.lastName}`.trim();

      await updateProfileMutation.mutateAsync({
        name: name || undefined,
        bio: profile.bio || undefined,
        avatar: avatar || undefined,
      });

      toast.success("Saved!");
    } catch {
      toast.error("Save failed");
    }
  };

  // ===== WALLET =====
  const handleLink = async () => {
    if (!isConnected || !address)
      return toast.error("Connect wallet first");

    try {
      const message = `Link wallet ${address} at ${new Date().toISOString()}`;
      const signature = await signMessageAsync({ message });

      await linkWalletMutation.mutateAsync({
        walletAddress: address,
        signature,
        message,
      });

      toast.success("Wallet linked!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">

      {/* HEADER */}
      <div className="p-6 border-b flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center">
            {avatar ? (
              <img src={avatar} className="w-full h-full object-cover" />
            ) : (
              <User />
            )}
          </div>

          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 p-1 bg-primary text-white rounded-full"
          >
            <Camera size={14} />
          </button>

          {avatar && (
            <button
              onClick={removeAvatar}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
            >
              <X size={12} />
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={onAvatarChange}
          />
        </div>

        <div>
          <h2 className="font-bold text-lg">
            {profile.firstName} {profile.lastName || "User"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {displayEmail || "No email"}
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">

        {/* LEFT */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                id="first"
                label="First Name"
                value={profile.firstName}
                onChange={(v) => updateField("firstName", v)}
              />
              <FormField
                id="last"
                label="Last Name"
                value={profile.lastName}
                onChange={(v) => updateField("lastName", v)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                id="phone"
                label="Phone"
                value={profile.phone}
                onChange={(v) => updateField("phone", v)}
              />

              <div>
                <Label>Gender</Label>
                <Select
                  value={profile.gender}
                  onValueChange={(v) => updateField("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DatePickerField
              id="dob"
              label="Date of Birth"
              value={profile.dateOfBirth}
              onChange={(v) => updateField("dateOfBirth", v)}
            />
          </CardContent>
        </Card>

        {/* RIGHT */}
        <div className="space-y-6">

          {/* WALLET */}
          <Card>
            <CardHeader>
              <CardTitle>Wallet</CardTitle>
              <CardDescription>
                Connect & link your wallet
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">

              <div className="p-3 border rounded-lg flex justify-between">
                <div>
                  <p className="text-sm font-medium">Linked</p>
                  <code className="text-xs">
                    {profileData?.user?.walletAddress || "None"}
                  </code>
                </div>

                {profileData?.user?.walletAddress && (
                  <a
                    href={`https://sepolia.etherscan.io/address/${profileData.user.walletAddress}`}
                    target="_blank"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>

              <div className="p-3 border rounded-lg flex justify-between">
                <div>
                  <p className="text-sm font-medium">Browser</p>
                  <code className="text-xs">
                    {isConnected ? address : "Disconnected"}
                  </code>
                </div>

                {!isConnected ? (
                  <ConnectButton />
                ) : (
                  <Button size="sm" onClick={handleLink}>
                    Link
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* META */}
          <Card>
            <CardContent className="text-xs text-muted-foreground">
              Member since{" "}
              {profileData?.user?.createdAt
                ? new Date(
                    profileData.user.createdAt
                  ).toLocaleDateString()
                : "N/A"}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FOOTER */}
      <div className="sticky bottom-0 border-t p-4 flex justify-end gap-3 bg-background/80 backdrop-blur">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateProfileMutation.isPending || isLoading}
        >
          {updateProfileMutation.isPending
            ? "Saving..."
            : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}